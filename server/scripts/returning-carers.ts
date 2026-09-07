/**
 * Who came back.
 *
 * Retention is the one claim in this project that cannot be demonstrated in a
 * walkthrough: it needs the same wallet on two different days. The carer log
 * records wallet and time for every action, so it is measurable — this prints
 * the measurement, read-only, from a copy of the production database.
 *
 *   MOCHI_DB=/path/to/mochi.db npm run retention
 *
 * Copy all three SQLite files (`mochi.db`, `mochi.db-wal`, `mochi.db-shm`) —
 * the server runs in WAL mode, and the newest rows live in the -wal file until
 * a checkpoint. Seed rows are excluded; there have never been any, and the
 * count is printed so that is checkable too.
 *
 * "Day" is a UTC calendar day. A wallet is *returning* if it acted on two or
 * more distinct days, which is stricter than "two visits" — two sessions the
 * same evening count once.
 */

import { existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

const path = process.env.MOCHI_DB
if (!path || !existsSync(path)) {
  console.error('set MOCHI_DB to a copy of the production database (mochi.db + -wal + -shm)')
  process.exit(2)
}

const db = new DatabaseSync(path, { readOnly: true })
const day = (col: string) => `date(${col} / 1000, 'unixepoch')`

type WalletRow = { name: string; events: number; days: number; first: string; last: string }
type Count = { n: number }

const wallets = db
  .prepare(
    `SELECT MIN(name) AS name, COUNT(*) AS events, COUNT(DISTINCT ${day('at')}) AS days,
            MIN(${day('at')}) AS first, MAX(${day('at')}) AS last
       FROM carer_event WHERE is_seed = 0
      GROUP BY wallet ORDER BY days DESC, events DESC`
  )
  .all() as unknown as WalletRow[]

const returning = wallets.filter((w) => w.days >= 2)
const seedRows = db
  .prepare('SELECT (SELECT COUNT(*) FROM carer_event WHERE is_seed = 1) + (SELECT COUNT(*) FROM chain_move WHERE is_seed = 1) AS n')
  .get() as unknown as Count
const activeDays = db
  .prepare(`SELECT COUNT(DISTINCT ${day('at')}) AS n FROM carer_event WHERE is_seed = 0`)
  .get() as unknown as Count
const span = db
  .prepare(`SELECT MIN(${day('at')}) AS first, MAX(${day('at')}) AS last FROM carer_event WHERE is_seed = 0`)
  .get() as unknown as { first: string; last: string }

console.log(`carer log ${span.first} → ${span.last}, ${activeDays.n} active days, ${seedRows.n} seed rows\n`)
console.log('  name                events  days  first       last')
for (const w of wallets) {
  console.log(
    `  ${w.name.padEnd(18)} ${String(w.events).padStart(6)}  ${String(w.days).padStart(4)}  ${w.first}  ${w.last}`
  )
}
console.log(`\n${wallets.length} distinct wallets · ${returning.length} acted on 2+ distinct UTC days`)
console.log(`returning: ${returning.map((w) => w.name).join(', ')}`)
