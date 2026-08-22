/**
 * Store coverage that stands on its own.
 *
 * away-line.test.ts and persistence.test.ts already pin the away-line and
 * restart-safety behaviours of this file in depth — this file does not
 * re-narrate their scenarios for narrative reasons, it re-derives the ones
 * needed so that `store.ts` is fully exercised when this file runs alone.
 * What it adds beyond that: a wallet's own last-touch in isolation, the
 * atomicity of a feeding when the write half fails, what corrupt wearables
 * JSON degrades to rather than crashing a broadcast, and the guard that
 * refuses to serve state for a creature that was never initialised.
 */

import { test, describe, beforeEach } from 'vitest'
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

describe('readPet', () => {
  test('reflects a genesis creature nobody has touched yet', () => {
    const pet = store.readPet(0)
    assert.equal(pet.feedCount, 0)
    assert.equal(pet.lastFedBy, 'nobody yet')
  })

  test('throws rather than fabricating state when the pet row is missing', () => {
    db.prepare('DELETE FROM pet WHERE id = 1').run()
    assert.throws(() => store.readPet(1000), /pet row missing/)
  })
})

describe('feed', () => {
  test('raises hunger, increments the size, and credits the carer, all together', () => {
    const before = store.readPet(1000)
    const after = store.feed({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })

    assert.equal(after.feedCount, before.feedCount + 1)
    assert.equal(after.lastFedBy, 'Ada')
    assert.equal(after.lastFedAt, 1000)
    assert.ok(after.hunger >= before.hunger, 'a feeding must not lower hunger')
    assert.equal(store.carerCount(), 1, 'the feeding is also a carer event')
  })

  test('a carer log the database refuses rolls the hunger and size update back with it', () => {
    // feed()'s docstring promises hunger, size and the carer credit rise
    // together or not at all. An out-of-enum kind is the cheapest way to make
    // the second half of that transaction fail without touching src/, and it
    // proves the first half never survives on its own.
    const before = store.readPet(1000)

    assert.throws(() => {
      store.feed({ wallet: ADA, name: 'Ada', kind: 'bogus' as unknown as 'feed', at: 1000 })
    }, /CHECK|constraint/i)

    const after = store.readPet(1000)
    assert.deepEqual(after, before, 'a rolled-back feeding must leave hunger and size exactly as they were')
  })
})

describe('teach', () => {
  test('appends a move crediting the teacher, and counts as tending', () => {
    const seq = store.teach({ wallet: ADA, name: 'Ada', at: 1000, emoteId: 'dance', wearables: ['urn:hat', 'urn:cape'] })

    assert.equal(seq, 1)
    assert.equal(store.chainLength(), 1)
    assert.equal(store.carerCount(), 1, 'teaching is also a carer event')

    const [move] = store.recentChain(10)
    assert.equal(move?.teacherName, 'Ada')
    assert.equal(move?.emoteId, 'dance')
    assert.deepEqual(move?.wearables, ['urn:hat', 'urn:cape'])
    assert.equal(move?.isSeed, false)
  })

  test('flags a row produced during the seeding drive', () => {
    store.teach({ wallet: ADA, name: 'Ada', at: 1000, emoteId: 'dance', wearables: [], isSeed: true })
    assert.equal(store.recentChain(10)[0]?.isSeed, true)
  })
})

describe('the away-line', () => {
  test('is null for a first-time visitor: nobody is owed a sentence about them', () => {
    assert.equal(store.awayLine(ADA), null)
  })

  test('is null when only your own acts follow your own acts', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'pet', at: 2000 })
    assert.equal(store.awayLine(ADA), null)
  })

  test('names the first person to act after your most recent visit', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'feed', at: 2000 })
    store.logCarer({ wallet: RUE, name: 'Rue', kind: 'pet', at: 3000 })
    assert.deepEqual(store.awayLine(ADA), { name: 'Kito', kind: 'feed', at: 2000 })
  })

  test('a tie on the same millisecond resolves by insertion order', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'pet', at: 2000 })
    store.logCarer({ wallet: RUE, name: 'Rue', kind: 'pet', at: 2000 })
    assert.equal(store.awayLine(ADA)?.name, 'Kito')
  })

  test('includes rows from the seeding drive — a flagged row is still a real person', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'feed', at: 2000, isSeed: true })
    assert.equal(store.awayLine(ADA)?.name, 'Kito')
  })

  test('opts.at overrides the wallet\'s own logged history, for a caller that already knows the cutoff', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'feed', at: 1500 })
    store.logCarer({ wallet: RUE, name: 'Rue', kind: 'pet', at: 5000 })

    // Ada's actual last event was at 1000, which on its own would surface
    // Kito. Passing 1500 explicitly must be honored over the stored history,
    // skipping Kito and landing on the next act after 1500.
    assert.deepEqual(store.awayLine(ADA, { at: 1500 }), { name: 'Rue', kind: 'pet', at: 5000 })
  })
})

describe('recentChain', () => {
  test('is oldest-first, and truncates to the tail when the chain is longer than the limit', () => {
    store.teach({ wallet: ADA, name: 'Ada', at: 1000, emoteId: 'a', wearables: [] })
    store.teach({ wallet: ADA, name: 'Ada', at: 2000, emoteId: 'b', wearables: [] })
    store.teach({ wallet: ADA, name: 'Ada', at: 3000, emoteId: 'c', wearables: [] })

    const tail = store.recentChain(2)
    assert.deepEqual(
      tail.map((m) => m.emoteId),
      ['b', 'c'],
      'the two most recent moves, oldest of the two first'
    )
  })

  test('wearables text that is not valid JSON becomes an empty wardrobe, not a crash', () => {
    // Written directly, bypassing teach()'s JSON.stringify, the way a row
    // from an older build or a hand edit could arrive.
    db.prepare(
      `INSERT INTO chain_move (emote_id, teacher_id, teacher_name, wearables, taught_at, is_seed)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run('dance', ADA, 'Ada', '{not valid json', 1000, 0)

    const chain = store.recentChain(10)
    assert.equal(chain.length, 1)
    assert.deepEqual(chain[0]?.wearables, [], 'a broadcast must never throw over one bad row')
  })

  test('wearables JSON that parses but is not an array also becomes an empty wardrobe', () => {
    db.prepare(
      `INSERT INTO chain_move (emote_id, teacher_id, teacher_name, wearables, taught_at, is_seed)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run('dance', ADA, 'Ada', '{"hat":true}', 1000, 0)

    const chain = store.recentChain(10)
    assert.deepEqual(chain[0]?.wearables, [], 'valid JSON is not enough — the shape must be an array too')
  })
})

describe('chainLength', () => {
  test('counts every taught move, independent of what recentChain returns', () => {
    assert.equal(store.chainLength(), 0)
    store.teach({ wallet: ADA, name: 'Ada', at: 1000, emoteId: 'a', wearables: [] })
    store.teach({ wallet: ADA, name: 'Ada', at: 2000, emoteId: 'b', wearables: [] })
    assert.equal(store.chainLength(), 2)
  })
})

describe('carersSince', () => {
  test('excludes events before the cutoff and orders most-recent-first', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'pet', at: 2000 })
    store.logCarer({ wallet: RUE, name: 'Rue', kind: 'stamp', at: 3000 })

    const carers = store.carersSince(2000)
    assert.deepEqual(
      carers.map((c) => c.name),
      ['Rue', 'Kito'],
      'the event before the cutoff must be excluded, and order must be most-recent-first'
    )
  })

  test('an explicit limit is honored instead of always falling back to the default of 50', () => {
    for (let i = 0; i < 5; i++) {
      store.logCarer({ wallet: ADA, name: 'Ada', kind: 'pet', at: 1000 + i })
    }
    const carers = store.carersSince(0, 2)
    assert.equal(carers.length, 2, 'the caller-supplied limit must be honored, not silently widened')
  })
})

describe('carerCount', () => {
  test('counts distinct wallets, not events', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'pet', at: 2000 })
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'stamp', at: 3000 })
    assert.equal(store.carerCount(), 2, 'Ada tended twice but is still one carer')
  })
})

describe('lastEventAt', () => {
  test('is null for a wallet that has never touched the creature', () => {
    assert.equal(store.lastEventAt(ADA), null)
  })

  test('reports the most recent event, not the first or the one logged last', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: 1000 })
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'stamp', at: 3000 })
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'pet', at: 2000 })
    assert.equal(store.lastEventAt(ADA), 3000, 'MAX(at), not insertion order')
  })

  test('only counts events from the wallet asked about', () => {
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'feed', at: 5000 })
    assert.equal(store.lastEventAt(ADA), null, "one wallet's history must not leak into another's")
  })
})
