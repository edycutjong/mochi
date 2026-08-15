/**
 * The away-line is the highest-value query in the system: it turns a broadcast
 * ("12 people were here") into a sentence addressed to one person ("Kito fed
 * Mochi after you left"). These tests pin every branch of it, including the
 * ones where the honest answer is *nothing*.
 */

import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import { openDatabase } from '../src/db.js'
import { Store } from '../src/store.js'
import { testConfig } from '../src/config.js'

const config = testConfig()
const ADA = '0x' + 'a1'.repeat(20)
const KITO = '0x' + 'b2'.repeat(20)
const RUE = '0x' + 'c3'.repeat(20)

let store: Store
let db: ReturnType<typeof openDatabase>

beforeEach(() => {
  db = openDatabase({ path: ':memory:', now: 0 })
  store = new Store(db, config.hunger)
})

describe('away-line', () => {
  test('names the first person to act after you, not the most recent', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'feed', at: 2000 })
    store.logCarer({ wallet: RUE, name: 'Rue', kind: 'pet', at: 3000 })

    const line = store.awayLine(ADA)
    assert.deepEqual(line, { name: 'Kito', kind: 'feed', at: 2000 })
  })

  test('is null for someone who has never touched the creature', () => {
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'feed', at: 2000 })
    assert.equal(store.awayLine(ADA), null)
  })

  test('is null on a completely empty world', () => {
    assert.equal(store.awayLine(ADA), null)
  })

  test('is null when you are the only person who has ever been here', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'pet', at: 2000 })
    assert.equal(store.awayLine(ADA), null)
  })

  test('is null when nobody has been here since you last were', () => {
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'feed', at: 1000 })
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 2000 })
    assert.equal(store.awayLine(ADA), null)
  })

  test('measures from your MOST RECENT visit, not your first', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'feed', at: 2000 })
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'stamp', at: 3000 })
    store.logCarer({ wallet: RUE, name: 'Rue', kind: 'teach', at: 4000 })

    assert.deepEqual(store.awayLine(ADA), { name: 'Rue', kind: 'teach', at: 4000 })
  })

  test('your own later acts do not shadow the stranger who followed you', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    // Ada's own follow-up is at the same instant as Kito's arrival. Excluding
    // by wallet rather than by row id is what keeps Kito the answer.
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'pet', at: 1000 })
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'feed', at: 1500 })

    assert.deepEqual(store.awayLine(ADA), { name: 'Kito', kind: 'feed', at: 1500 })
  })

  test('ties on the same millisecond resolve by insertion order, stably', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'pet', at: 2000 })
    store.logCarer({ wallet: RUE, name: 'Rue', kind: 'pet', at: 2000 })

    assert.equal(store.awayLine(ADA)?.name, 'Kito')
    assert.equal(store.awayLine(ADA)?.name, 'Kito', 'repeated calls must agree')
  })

  test('an act exactly on your timestamp is not "after" you', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'feed', at: 1000 })
    assert.equal(store.awayLine(ADA), null)
  })

  test('reports the kind of act, so the sentence can say what they did', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'teach', at: 2000 })
    assert.equal(store.awayLine(ADA)?.kind, 'teach')
  })

  test('includes rows from the seeding drive — a flagged row is still a real person', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'feed', at: 2000, isSeed: true })
    assert.equal(store.awayLine(ADA)?.name, 'Kito')
  })

  test('teaching counts as an act, on both sides of the comparison', () => {
    store.teach({ wallet: ADA, name: 'Ada', at: 1000, emoteId: 'dance', wearables: [] })
    store.teach({ wallet: KITO, name: 'Kito', at: 2000, emoteId: 'clap', wearables: [] })
    assert.deepEqual(store.awayLine(ADA), { name: 'Kito', kind: 'teach', at: 2000 })
  })

  test('feeding counts as an act, on both sides of the comparison', () => {
    store.feed({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    store.feed({ wallet: KITO, name: 'Kito', kind: 'feed', at: 2000 })
    assert.equal(store.awayLine(ADA)?.name, 'Kito')
  })
})
