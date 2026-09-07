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
 *         MOCHI_DB=/path/to/mochi.db node --experimental-strip-types scripts/check_submission_readiness.ts
 * Exits 0 when clean, 1 when anything failed. A check that cannot run without
 * the production database is reported as `skip`, never silently passed.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, extname, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '..')

type Failure = { check: string; detail: string }
const failures: Failure[] = []
const passed: string[] = []
const skipped: Failure[] = []

function fail(check: string, detail: string) {
  failures.push({ check, detail })
}
function pass(check: string) {
  passed.push(check)
}
/**
 * A check that could not run here is neither a pass nor a fail — reporting it
 * as FAIL taught every CI run to show red, and a gate that is always red is
 * one nobody reads. It is printed loudly and separately instead, and the
 * README says how to run it for real.
 */
function skip(check: string, detail: string) {
  skipped.push({ check, detail })
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
    const scannable = isLandingSource(file) ? withoutFallbackMachinery(text) : text
    for (const p of patterns) {
      if (p.test(scannable)) hits.push(`${relative(ROOT, file)} matches ${p}`)
    }
  }

  if (hits.length) fail('placeholders', hits.join('\n    '))
  else pass('no placeholder text in shipped files')
}

const isLandingSource = (file: string) => relative(ROOT, file).startsWith(join('landing', 'src'))

/**
 * The landing page renders `«PENDING:…»` on purpose when a fact is not yet
 * known — the constants that carry those strings are the mechanism that makes
 * an unresolved fact visible rather than a lie. So in landing source the
 * scanner ignores (a) the line that defines a `*_PENDING` constant and (b)
 * comment lines that talk about them, and `checkLandingResolved` below asserts
 * the facts themselves are filled in. A `«PENDING:…»` anywhere else in the
 * landing — say, typed straight into JSX — still fails.
 */
function withoutFallbackMachinery(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !/^\s*export const \w+_PENDING\s*=/.test(line))
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n')
}

/**
 * 1b. The landing's unresolved facts.
 *
 * `landing/src/lib/mochi.ts` declares each late-bound fact as
 * `export const NAME: string | null = <value>`. `null` means the page shows a
 * `«PENDING:…»` token for it. Before submission every one must hold a real
 * non-empty string.
 */
function checkLandingResolved() {
  const file = join(ROOT, 'landing', 'src', 'lib', 'mochi.ts')
  if (!existsSync(file)) {
    skip('landing facts', 'landing/src/lib/mochi.ts not present')
    return
  }
  const text = readFileSync(file, 'utf8')
  const facts = [...text.matchAll(/export const (\w+): string \| null =\s*([^;]+);/g)]
  if (facts.length === 0) {
    fail('landing facts', 'no `: string | null` facts found in landing/src/lib/mochi.ts — the pattern moved')
    return
  }
  const unresolved = facts
    .filter(([, , value]) => !/^"[^"]+"$/.test(value.trim()))
    .map(([, name, value]) => `${name} = ${value.trim()}`)
  if (unresolved.length) fail('landing facts', unresolved.join(', '))
  else pass(`landing facts resolved: ${facts.map(([, name]) => name).join(', ')}`)
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

  // The frame-rate overlay used to calibrate the fidelity watchdog. Deleted
  // once it had served its purpose, but it is one `git revert` away and it
  // draws a debug box over the creature — the first thing a judge sees. The
  // check stays so restoring it cannot quietly reach a submission.
  const readout = join(ROOT, 'src', 'ui', 'fps-readout.ts')
  if (existsSync(readout) && /export const SHOW_FPS\s*=\s*true/.test(readFileSync(readout, 'utf8'))) {
    fail('scaffolding', 'src/ui/fps-readout.ts still has SHOW_FPS = true — the debug overlay would ship')
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
    skip('seed rows', `needs the production database: MOCHI_DB=/path/to/mochi.db (looked for ${db ?? 'unset'})`)
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
checkLandingResolved()
checkScaffolding()
checkSeedRows()
checkDemoHonesty()
checkRequiredFiles()
checkSceneMetadata()
checkPrivateMaterial(files)

for (const p of passed) console.log(`  ok    ${p}`)
for (const k of skipped) console.log(`  skip  ${k.check}: ${k.detail}`)
for (const f of failures) console.error(`  FAIL  ${f.check}: ${f.detail}`)

const skippedNote = skipped.length ? `, ${skipped.length} skipped (not run here)` : ''
console.log(`\n${passed.length} passed, ${failures.length} failed${skippedNote}`)
process.exit(failures.length ? 1 : 0)
