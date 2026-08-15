/**
 * Local development fixture.
 *
 * Fills a *separate, throwaway* database with obviously-synthetic rows so the
 * scene can be built and looked at offline. Every row it writes is prefixed
 * `DEV_ONLY_` and flagged `is_seed`, so it is identifiable at a glance in the
 * data itself and not only in this comment.
 *
 * Two guards, because the cost of getting this wrong is a permanent public log
 * with invented people in it:
 *   1. it refuses to run with NODE_ENV=production
 *   2. it writes to its own path (MOCHI_DEV_DB_PATH, default ./data/dev.db) and
 *      never to MOCHI_DB_PATH
 *
 * Run: npm run seed:dev
 */

import { openDatabase } from '../src/db.js'
import { Store } from '../src/store.js'
import { testConfig } from '../src/config.js'

if (process.env['NODE_ENV'] === 'production') {
  console.error('refusing to run the development fixture with NODE_ENV=production')
  process.exit(1)
}

const path = process.env['MOCHI_DEV_DB_PATH']?.trim() || './data/dev.db'
if (process.env['MOCHI_DB_PATH'] && process.env['MOCHI_DB_PATH'] === path) {
  console.error('MOCHI_DEV_DB_PATH must differ from MOCHI_DB_PATH')
  process.exit(1)
}

const HOUR = 3_600_000
const now = Date.now()

const people = [
  { wallet: '0x' + '11'.repeat(20), name: 'DEV_ONLY_alice', emote: 'dance' },
  { wallet: '0x' + '22'.repeat(20), name: 'DEV_ONLY_bruno', emote: 'clap' },
  { wallet: '0x' + '33'.repeat(20), name: 'DEV_ONLY_cyd', emote: 'headexplode' }
]

const config = testConfig({ dbPath: path })
const db = openDatabase({ path })
const store = new Store(db, config.hunger)

people.forEach((person, index) => {
  const at = now - (people.length - index) * 3 * HOUR
  store.feed({ wallet: person.wallet, name: person.name, kind: 'feed', at, isSeed: true })
  store.teach({
    wallet: person.wallet,
    name: person.name,
    at: at + 60_000,
    emoteId: person.emote,
    wearables: [`urn:dev:wearable:${index}`],
    isSeed: true
  })
})

const state = store.readPet(now)
console.log(
  `seeded ${path}: feedings=${state.feedCount} chain=${store.chainLength()} carers=${store.carerCount()} ` +
    `(all rows DEV_ONLY_, is_seed=1)`
)
db.close()
