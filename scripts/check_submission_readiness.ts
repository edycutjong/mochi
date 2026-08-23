/**
 * Submission readiness gate.
 *
 * Run this before the repository goes public. It fails loudly on the specific
 * ways a hackathon project lies about itself without anyone intending to:
 *
 *   - placeholder text that was going to be replaced later
 *   - development scaffolding still driving what a visitor sees
 *   - seeded rows in the database that were never real people
 *   - a reproduce command that quietly disables the thing being demonstrated
 *
 * Every check is mechanical. The point is that "we remembered" is not a
 * control, and a script that runs in CI is.
 *
 * Usage:  node --experimental-strip-types scripts/check_submission_readiness.ts
 * Exits 0 when clean, 1 when anything failed.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, extname, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '..')

type Failure = { check: string; detail: string }
const failures: Failure[] = []
const passed: string[] = []

function fail(check: string, detail: string) {
  failures.push({ check, detail })
}
function pass(check: string) {
  passed.push(check)
}

/** Files a judge actually reads or runs. Kitchen and deps are not our concern. */
function sourceFiles(): string[] {
  const skip = new Set(['node_modules', 'bin', '.git', 'dclcontext', 'qa'])
  const out: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (skip.has(name)) continue
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (['.ts', '.tsx', '.md', '.json'].includes(extname(name))) out.push(full)
    }
  }
  walk(ROOT)
  return out
}

// ---------------------------------------------------------------------------

/**
 * 1. Placeholders.
 *
 * Excludes this file, which necessarily contains the words it hunts for.
 */
function checkPlaceholders(files: string[]) {
  // Case-sensitive on the shouty ones: prose legitimately discusses a
  // "placeholder", and flagging a comment that explains a design decision
  // trains people to ignore this script.
  // Case-sensitive on the shouty ones: prose legitimately discusses a
  // "placeholder", and flagging a comment that explains a design decision
  // trains people to ignore this script.
  //
  // «PENDING:…» is the marker used for values that cannot be known until the
  // scene is deployed and measured — the World URL, the performance score. A
  // judge reading one of those is reading a promise, so they must all be
  // resolved before this passes.
  const patterns = [
    /\bTODO\b/,
    /\bFIXME\b/,
    /\bXXX\b/,
    /lorem ipsum/i,
    /\bPLACEHOLDER\b/,
    /not wired yet/i,
    /«PENDING:[^»]*»/
  ]
  const hits: string[] = []

  for (const file of files) {
    if (file === import.meta.filename) continue
    const text = readFileSync(file, 'utf8')
    for (const p of patterns) {
      if (p.test(text)) hits.push(`${relative(ROOT, file)} matches ${p}`)
    }
  }

  if (hits.length) fail('placeholders', hits.join('\n    '))
  else pass('no placeholder text in shipped files')
}

/**
 * 2. Development scaffolding.
 *
 * The scene has a MODE switch that runs a capability probe instead of the
 * actual experience, and local counters that stand in for server-owned state.
 * Either one reaching a visitor means they are looking at something that is
 * not the product.
 */
function checkScaffolding() {
  const index = join(ROOT, 'src', 'index.ts')
  if (!existsSync(index)) {
    fail('scaffolding', 'src/index.ts is missing')
    return
  }
  const text = readFileSync(index, 'utf8')

  if (/MODE\s*[:=][^=]*['"]probe['"]/.test(text) && /const MODE.*=\s*'probe'/.test(text)) {
    fail('scaffolding', "src/index.ts still starts in 'probe' mode")
  }
  if (/localFeedCount/.test(text) || /localChain/.test(text)) {
    fail(
      'scaffolding',
      'local feed/chain counters are still present — size and the chain must come from the server'
    )
  }
  if (!failures.some((f) => f.check === 'scaffolding')) pass('no development scaffolding in the scene entry')
}

/**
 * 3. Seeded rows.
 *
 * The database carries an `is_seed` flag so that state created for testing can
 * never be silently counted as real people. Any seeded row still present at
 * submission is a claim about a human being that is not true.
 */
function checkSeedRows() {
  const db = process.env.MOCHI_DB
  if (!db || !existsSync(db)) {
    fail('seed rows', `set MOCHI_DB to the production database to check it (looked for ${db ?? 'unset'})`)
    return
  }
  // Deliberately not opening the DB with a driver: this script must run with
  // zero dependencies. A grep of the file catches the markers either way.
  //
  // Both prefixes are checked. The development fixture writes DEV_ONLY_ rows
  // and the benchmark writes BENCH_ONLY_ ones; each refuses to open the live
  // database, but that refusal is a guard and this is the check that the guard
  // held.
  const raw = readFileSync(db)
  const found = ['DEV_ONLY_', 'BENCH_ONLY_'].filter((marker) => raw.includes(Buffer.from(marker)))
  if (found.length) {
    fail('seed rows', `${db} contains ${found.join(' and ')} rows`)
  } else {
    pass('no synthetic rows in the production database')
  }
}

/**
 * 4. The reproduce command.
 *
 * A demo whose instructions include a flag that turns off the judged capability
 * is not a demo of that capability.
 */
function checkDemoHonesty() {
  const demo = join(ROOT, 'DEMO.md')
  if (!existsSync(demo)) {
    fail('demo', 'DEMO.md is missing')
    return
  }
  const text = readFileSync(demo, 'utf8')
  const banned = [/--mock/i, /--offline/i, /--no-server/i, /--fake/i, /--skip-/i, /MOCK_/, /USE_FIXTURES/]
  const hits = banned.filter((b) => b.test(text)).map(String)

  if (hits.length) fail('demo', `DEMO.md reproduce steps disable the real path: ${hits.join(', ')}`)
  else pass('DEMO.md reproduce steps do not disable the real path')
}

/** 5. Hard submission requirements that are simply either present or not. */
function checkRequiredFiles() {
  for (const f of ['LICENSE', 'README.md', 'DEMO.md', 'ARCHITECTURE.md', 'scene.json']) {
    if (existsSync(join(ROOT, f))) pass(`${f} present`)
    else fail('required files', `${f} is missing`)
  }
}

/** 6. scene.json must not ship with empty identity fields. */
function checkSceneMetadata() {
  const path = join(ROOT, 'scene.json')
  if (!existsSync(path)) return
  const scene = JSON.parse(readFileSync(path, 'utf8'))

  if (!scene.display?.title) fail('scene.json', 'display.title is empty')
  if (!scene.contact?.name) fail('scene.json', 'contact.name is empty')
  if (!failures.some((f) => f.check === 'scene.json')) pass('scene.json identity fields populated')
}

/**
 * 7. Private working material.
 *
 * The planning documents for this project live outside the repository by
 * design. If their vocabulary appears in here, something crossed that was
 * never meant to be public.
 *
 * The search terms are assembled from fragments rather than written out. A
 * checker that hunts for a word has to contain that word, which would make
 * this file the very leak it is looking for — every scan would then find
 * itself and every reader would learn the vocabulary anyway.
 */
function checkPrivateMaterial(files: string[]) {
  const dir = (name: string) => new RegExp(`_${name}` + '/')
  const phrase = (...words: string[]) => new RegExp(words.join('\\s+'), 'i')

  const terms = [
    dir('spe' + 'cs'),
    dir('ide' + 'as'),
    new RegExp('LESS' + 'ONS\\.md'),
    phrase('the', 'rub' + 'ric'),
    phrase('swi' + 'tch', 'ga' + 'te')
  ]
  const hits: string[] = []

  for (const file of files) {
    if (file === import.meta.filename) continue
    const text = readFileSync(file, 'utf8')
    for (const t of terms) if (t.test(text)) hits.push(`${relative(ROOT, file)} matches ${t}`)
  }

  if (hits.length) fail('private material', hits.join('\n    '))
  else pass('no private planning material in the repository')
}

// ---------------------------------------------------------------------------

const files = sourceFiles()
checkPlaceholders(files)
checkScaffolding()
checkSeedRows()
checkDemoHonesty()
checkRequiredFiles()
checkSceneMetadata()
checkPrivateMaterial(files)

for (const p of passed) console.log(`  ok    ${p}`)
for (const f of failures) console.error(`  FAIL  ${f.check}: ${f.detail}`)

console.log(`\n${passed.length} passed, ${failures.length} failed`)
process.exit(failures.length ? 1 : 0)
