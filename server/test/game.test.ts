/**
 * Additional coverage for the room's rules engine.
 *
 * `test/room.test.ts` is the main suite; this file is additive and stands on
 * its own (it is run and measured independently), so it re-establishes its
 * own fixtures rather than reaching into the other file. It exists to close
 * the branches the main suite does not exercise: a successful `pet` and a
 * successful `stamp` reaching the carer log, both halves of the "no writes
 * before hello" guard (including the wallet-set-but-nameless corner no
 * legitimate client can reach), and the broadcast edges — nobody home, and
 * one dead sink among live ones.
 */

import { test, describe, beforeEach } from 'vitest'
import assert from 'node:assert/strict'

import { openDatabase } from '../src/db.js'
import { Store } from '../src/store.js'
import { Room, type Sink } from '../src/game.js'
import { testConfig } from '../src/config.js'
import type { ErrorMessage, ServerMessage, StateMessage } from '../src/protocol.js'

const ADA = '0x' + 'a1'.repeat(20)
const KITO = '0x' + 'b2'.repeat(20)

class Recorder implements Sink {
  readonly messages: ServerMessage[] = []
  send(message: ServerMessage): void {
    this.messages.push(message)
  }
  get last(): ServerMessage | undefined {
    return this.messages[this.messages.length - 1]
  }
  get errors(): ErrorMessage[] {
    return this.messages.filter((m): m is ErrorMessage => m.t === 'error')
  }
  get states(): StateMessage[] {
    return this.messages.filter((m): m is StateMessage => m.t === 'state')
  }
}

let db: ReturnType<typeof openDatabase>
let store: Store
let room: Room
let clock = 1_000_000

const config = testConfig()

function connect(): { sink: Recorder; handle: ReturnType<Room['connect']> } {
  const sink = new Recorder()
  return { sink, handle: room.connect(sink) }
}

function helloAs(wallet: string, name: string, isGuest = false) {
  const { sink, handle } = connect()
  handle.receive({ t: 'hello', wallet, name, isGuest })
  return { sink, handle }
}

function countCarers(kind?: string): number {
  const row = kind
    ? (db.prepare('SELECT COUNT(*) AS n FROM carer_event WHERE kind = ?').get(kind) as unknown as {
        n: number
      })
    : (db.prepare('SELECT COUNT(*) AS n FROM carer_event').get() as unknown as { n: number })
  return row.n
}

beforeEach(() => {
  clock = 1_000_000
  db = openDatabase({ path: ':memory:', now: clock })
  store = new Store(db, config.hunger)
  room = new Room(store, config, { now: () => clock })
})

describe('unrecognised input', () => {
  test('junk that fails parsing is refused before it can reach onHello or onMutation', () => {
    const { sink, handle } = connect()
    for (const junk of [null, undefined, 42, 'hello', [], {}, { t: 'self_destruct' }]) {
      handle.receive(junk)
    }
    assert.equal(sink.errors.length, 7)
    for (const error of sink.errors) assert.equal(error.code, 'bad_message')
  })
})

describe('the handshake gates', () => {
  test('a second hello on the same connection is refused', () => {
    const { sink, handle } = helloAs(ADA, 'Ada')
    handle.receive({ t: 'hello', wallet: KITO, name: 'Kito', isGuest: false })
    assert.equal(sink.errors[0]?.code, 'already_hello')
  })

  test('a malformed wallet is refused with bad_wallet', () => {
    const { sink, handle } = connect()
    handle.receive({ t: 'hello', wallet: 'not-a-wallet', name: 'Ada', isGuest: false })
    assert.equal(sink.errors[0]?.code, 'bad_wallet')
  })

  test('a blank name is refused with name_required', () => {
    const { sink, handle } = connect()
    handle.receive({ t: 'hello', wallet: ADA, name: '   ', isGuest: false })
    assert.equal(sink.errors[0]?.code, 'name_required')
  })
})

describe('write gates that apply after a valid hello', () => {
  test('a guest is refused with guest_read_only, never hello_required', () => {
    const { sink, handle } = helloAs(ADA, 'Guest', true)
    handle.receive({ t: 'pet' })
    assert.equal(sink.errors[0]?.code, 'guest_read_only')
    assert.equal(countCarers(), 0)
  })

  test('exceeding the per-minute limit is refused with rate_limited and a retryAt', () => {
    const { sink, handle } = helloAs(ADA, 'Ada')
    for (let i = 0; i < config.limits.pet + 1; i++) handle.receive({ t: 'pet' })

    assert.equal(countCarers('pet'), config.limits.pet)
    const refusal = sink.errors[0]
    assert.equal(refusal?.code, 'rate_limited')
    assert.ok((refusal?.retryAt ?? 0) > clock)
  })
})

describe('feed and teach — the other two mutating kinds', () => {
  test('feed raises the size and credits the feeder', () => {
    const { handle } = helloAs(ADA, 'Ada')
    handle.receive({ t: 'feed' })
    assert.equal(store.readPet(clock).feedCount, 1)
    assert.equal(store.readPet(clock).lastFedBy, 'Ada')
  })

  test('teach appends a move to the chain, credited to the teacher', () => {
    const { handle } = helloAs(ADA, 'Ada')
    handle.receive({ t: 'teach', emoteId: 'wave', wearables: [] })
    const chain = store.recentChain(10)
    assert.equal(chain.length, 1)
    assert.equal(chain[0]?.teacherName, 'Ada')
  })
})

describe('pet and stamp — the two carer kinds room.test.ts never writes successfully', () => {
  test('a pet from a signed-in wallet is logged as a carer event', () => {
    const { handle } = helloAs(ADA, 'Ada')
    handle.receive({ t: 'pet' })
    assert.equal(countCarers('pet'), 1)
  })

  test('a stamp from a signed-in wallet is logged as a carer event', () => {
    const { handle } = helloAs(ADA, 'Ada')
    handle.receive({ t: 'stamp' })
    assert.equal(countCarers('stamp'), 1)
  })

  test('pet and stamp both broadcast the new world, same as feed and teach', () => {
    const watcher = helloAs(KITO, 'Kito')
    const actor = helloAs(ADA, 'Ada')

    const before = watcher.sink.states.length
    actor.handle.receive({ t: 'pet' })
    actor.handle.receive({ t: 'stamp' })

    assert.equal(watcher.sink.states.length, before + 2)
  })
})

describe('the hello_required guard has two operands, not one', () => {
  test('a message before hello is refused because there is no wallet yet', () => {
    const { sink, handle } = connect()
    handle.receive({ t: 'pet' })
    assert.equal(sink.errors[0]?.code, 'hello_required')
  })

  test('a session whose wallet is set but whose name is missing still cannot write', () => {
    // No real client can reach this: `onHello` sets `wallet` and `name`
    // together. It guards the invariant anyway rather than trusting it, so
    // this test breaks the invariant on purpose (mutating the session object
    // `connect` handed back) to prove the second half of the check is live,
    // not dead code riding along with the first half.
    const { sink, handle } = helloAs(ADA, 'Ada')
    handle.session.name = null
    handle.receive({ t: 'pet' })
    assert.equal(sink.errors[0]?.code, 'hello_required')
    assert.equal(countCarers(), 0)
  })
})

describe('broadcast edges', () => {
  test('broadcasting to an empty room does nothing and throws nothing', () => {
    assert.equal(room.connectionCount, 0)
    room.broadcast()
  })

  test('a sink that throws on send does not stop a later sink in the same broadcast', () => {
    const exploding: Sink = {
      send() {
        throw new Error('socket is gone')
      }
    }
    room.connect(exploding)
    const watcher = helloAs(KITO, 'Kito')
    const actor = helloAs(ADA, 'Ada')

    const before = watcher.sink.states.length
    actor.handle.receive({ t: 'stamp' })
    assert.equal(watcher.sink.states.length, before + 1)
  })
})

describe('connection bookkeeping', () => {
  test('connectionCount tracks connect and close', () => {
    assert.equal(room.connectionCount, 0)
    const a = connect()
    assert.equal(room.connectionCount, 1)
    const b = connect()
    assert.equal(room.connectionCount, 2)
    a.handle.close()
    assert.equal(room.connectionCount, 1)
    b.handle.close()
    assert.equal(room.connectionCount, 0)
  })
})

describe('buildState can be asked about a specific instant', () => {
  test('an explicit timestamp is used verbatim instead of the room clock', () => {
    const state = room.buildState(42)
    assert.equal(state.now, 42)
  })
})

describe('the clock defaults to wall time when nothing is injected', () => {
  test('a room built with no options still produces a real, current timestamp', () => {
    const before = Date.now()
    const wallClockRoom = new Room(store, config)
    const state = wallClockRoom.buildState()
    const after = Date.now()

    assert.ok(state.now >= before && state.now <= after)
  })
})
