/**
 * Restart safety.
 *
 * The whole point of an authoritative server here is that what people leave
 * behind outlives them — and outlives the process. These tests write through a
 * real file, close the database, reopen it, and assert that the world came
 * back: the size, the plaque, the chain with its credits, and the away-line.
 */

import { test, describe, afterAll } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { openDatabase } from '../src/db.js'
import { Store } from '../src/store.js'
import { Room } from '../src/game.js'
import { testConfig } from '../src/config.js'
import type { ServerMessage, StateMessage } from '../src/protocol.js'

const ADA = '0x' + 'a1'.repeat(20)
const KITO = '0x' + 'b2'.repeat(20)

const roots: string[] = []

function tempDbPath(): string {
  const root = mkdtempSync(join(tmpdir(), 'mochi-test-'))
  roots.push(root)
  return join(root, 'mochi.db')
}

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

const config = testConfig()

describe('state survives a restart', () => {
  test('feedings, the plaque, the chain and its credits all come back', () => {
    const path = tempDbPath()
    const t0 = 1_700_000_000_000

    // --- process one ---------------------------------------------------
    {
      const db = openDatabase({ path, now: t0 })
      const store = new Store(db, config.hunger)
      store.feed({ wallet: ADA, name: 'Ada', kind: 'feed', at: t0 })
      store.feed({ wallet: KITO, name: 'Kito', kind: 'feed', at: t0 + 1000 })
      store.teach({ wallet: ADA, name: 'Ada', at: t0 + 2000, emoteId: 'dance', wearables: ['urn:hat'] })
      store.logCarer({ wallet: KITO, name: 'Kito', kind: 'stamp', at: t0 + 3000 })
      db.close()
    }

    // --- process two ---------------------------------------------------
    const db = openDatabase({ path, now: t0 + 10_000 })
    const store = new Store(db, config.hunger)

    const pet = store.readPet(t0 + 4000)
    assert.equal(pet.feedCount, 2, 'the size is the sum of every feeding, across restarts')
    assert.equal(pet.lastFedBy, 'Kito')
    assert.equal(pet.lastFedAt, t0 + 1000)

    const chain = store.recentChain(10)
    assert.equal(chain.length, 1)
    assert.equal(chain[0]?.teacherName, 'Ada')
    assert.deepEqual(chain[0]?.wearables, ['urn:hat'])

    assert.equal(store.carerCount(), 2)
    assert.equal(store.chainLength(), 1)
    db.close()
  })

  test('reopening does not reset the creature to its genesis row', () => {
    const path = tempDbPath()
    const t0 = 1_700_000_000_000

    const first = openDatabase({ path, now: t0 })
    new Store(first, config.hunger).feed({ wallet: ADA, name: 'Ada', kind: 'feed', at: t0 })
    first.close()

    const second = openDatabase({ path, now: t0 + 1 })
    assert.equal(new Store(second, config.hunger).readPet(t0).lastFedBy, 'Ada')
    second.close()

    const third = openDatabase({ path, now: t0 + 2 })
    assert.equal(new Store(third, config.hunger).readPet(t0).feedCount, 1)
    third.close()
  })

  test('hunger keeps decaying across downtime — no timer has to survive', () => {
    const path = tempDbPath()
    const t0 = 1_700_000_000_000

    const first = openDatabase({ path, now: t0 })
    new Store(first, config.hunger).feed({ wallet: ADA, name: 'Ada', kind: 'feed', at: t0 })
    first.close()

    // The server is down for a week.
    const second = openDatabase({ path, now: t0 })
    const store = new Store(second, config.hunger)
    const hunger = store.readPet(t0 + 7 * 24 * 3_600_000).hunger
    assert.equal(hunger, config.hunger.floor, 'a week away lands on the floor')
    assert.ok(hunger > 0, 'and never below it')
    second.close()
  })

  test('the away-line still works after a restart', () => {
    const path = tempDbPath()
    const t0 = 1_700_000_000_000

    const first = openDatabase({ path, now: t0 })
    const firstStore = new Store(first, config.hunger)
    firstStore.feed({ wallet: ADA, name: 'Ada', kind: 'feed', at: t0 })
    firstStore.feed({ wallet: KITO, name: 'Kito', kind: 'feed', at: t0 + 60_000 })
    first.close()

    const second = openDatabase({ path, now: t0 })
    const store = new Store(second, config.hunger)
    const room = new Room(store, config, { now: () => t0 + 120_000 })

    const messages: ServerMessage[] = []
    const handle = room.connect({ send: (m) => messages.push(m) })
    handle.receive({ t: 'hello', wallet: ADA, name: 'Ada', isGuest: false })

    const state = messages[0] as StateMessage
    assert.equal(state.awayLine?.name, 'Kito')
    assert.equal(state.pet.feedCount, 2)
    second.close()
  })

  test('the chain sequence continues rather than restarting at one', () => {
    const path = tempDbPath()
    const t0 = 1_700_000_000_000

    const first = openDatabase({ path, now: t0 })
    const firstStore = new Store(first, config.hunger)
    firstStore.teach({ wallet: ADA, name: 'Ada', at: t0, emoteId: 'a', wearables: [] })
    firstStore.teach({ wallet: ADA, name: 'Ada', at: t0 + 1, emoteId: 'b', wearables: [] })
    first.close()

    const second = openDatabase({ path, now: t0 })
    const store = new Store(second, config.hunger)
    store.teach({ wallet: KITO, name: 'Kito', at: t0 + 2, emoteId: 'c', wearables: [] })

    assert.deepEqual(
      store.recentChain(10).map((m) => m.seq),
      [1, 2, 3]
    )
    second.close()
  })

  test('the seeding flag is persisted, not inferred', () => {
    const path = tempDbPath()
    const t0 = 1_700_000_000_000

    const first = openDatabase({ path, now: t0 })
    const firstStore = new Store(first, config.hunger)
    firstStore.teach({ wallet: ADA, name: 'Ada', at: t0, emoteId: 'a', wearables: [], isSeed: true })
    firstStore.teach({ wallet: KITO, name: 'Kito', at: t0 + 1, emoteId: 'b', wearables: [] })
    first.close()

    const second = openDatabase({ path, now: t0 })
    assert.deepEqual(
      new Store(second, config.hunger).recentChain(10).map((m) => m.isSeed),
      [true, false]
    )
    second.close()
  })
})

describe('schema guards', () => {
  test('a chain move without a teacher name is refused by the database itself', () => {
    const db = openDatabase({ path: ':memory:' })
    assert.throws(() => {
      db.prepare(
        'INSERT INTO chain_move (emote_id, teacher_id, teacher_name, wearables, taught_at) VALUES (?, ?, ?, ?, ?)'
      ).run('dance', ADA, null, '[]', 1)
    }, /NOT NULL/i)
    db.close()
  })

  test('there can only ever be one creature', () => {
    const db = openDatabase({ path: ':memory:' })
    assert.throws(() => {
      db.prepare('INSERT INTO pet (id, hunger, feed_count, last_fed_at, last_fed_by) VALUES (2, 1, 0, 0, ?)').run('x')
    }, /CHECK|constraint/i)
    db.close()
  })

  test('an unknown carer event kind is refused by the database itself', () => {
    const db = openDatabase({ path: ':memory:' })
    assert.throws(() => {
      db.prepare('INSERT INTO carer_event (wallet, name, kind, at) VALUES (?, ?, ?, ?)').run(ADA, 'Ada', 'mine', 1)
    }, /CHECK|constraint/i)
    db.close()
  })
})
