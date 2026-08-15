/**
 * The room's rules, exercised without a socket.
 *
 * `Room` talks to the outside world through a `Sink`, so a test can be the
 * transport: push messages in, collect what comes back, and assert on both the
 * replies and — more importantly — on what did or did not reach the database.
 */

import { test, describe, beforeEach } from 'node:test'
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

function countCarers(): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM carer_event').get() as unknown as { n: number }).n
}

function countChain(): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM chain_move').get() as unknown as { n: number }).n
}

beforeEach(() => {
  clock = 1_000_000
  db = openDatabase({ path: ':memory:', now: clock })
  store = new Store(db, config.hunger)
  room = new Room(store, config, { now: () => clock })
})

describe('handshake', () => {
  test('hello returns the whole world plus who the server thinks you are', () => {
    const { sink } = helloAs(ADA, 'Ada')
    const state = sink.last as StateMessage

    assert.equal(state.t, 'state')
    assert.equal(state.you?.wallet, ADA)
    assert.equal(state.you?.name, 'Ada')
    assert.equal(state.you?.canWrite, true)
    assert.equal(state.pet.feedCount, 0)
    assert.deepEqual(state.chain, [])
  })

  test('the away-line rides along with the hello reply and only there', () => {
    store.logCarer({ wallet: ADA, name: 'Ada', kind: 'feed', at: clock - 20_000 })
    store.logCarer({ wallet: KITO, name: 'Kito', kind: 'feed', at: clock - 10_000 })

    const { sink } = helloAs(ADA, 'Ada')
    assert.equal((sink.last as StateMessage).awayLine?.name, 'Kito')

    // A later broadcast is addressed to the room, so it carries no away-line.
    const other = helloAs(KITO, 'Kito')
    other.handle.receive({ t: 'feed' })
    const broadcast = sink.states[sink.states.length - 1]!
    assert.equal(broadcast.awayLine, undefined)
  })

  test('a wallet address is required', () => {
    const { sink, handle } = connect()
    handle.receive({ t: 'hello', wallet: 'not-a-wallet', name: 'Ada', isGuest: false })
    assert.equal(sink.errors[0]?.code, 'bad_wallet')
  })

  test('a display name is required — the chain is never anonymous', () => {
    const { sink, handle } = connect()
    handle.receive({ t: 'hello', wallet: ADA, name: '   ', isGuest: false })
    assert.equal(sink.errors[0]?.code, 'name_required')
  })

  test('a nameless session cannot then write anything', () => {
    const { handle } = connect()
    handle.receive({ t: 'hello', wallet: ADA, name: '', isGuest: false })
    handle.receive({ t: 'feed' })
    assert.equal(countCarers(), 0)
  })

  test('a connection cannot introduce itself twice', () => {
    const { sink, handle } = helloAs(ADA, 'Ada')
    handle.receive({ t: 'hello', wallet: KITO, name: 'Kito', isGuest: false })
    assert.equal(sink.errors[0]?.code, 'already_hello')
  })

  test('the wallet is normalised, so casing cannot fork one person into two', () => {
    const { sink } = helloAs(ADA.toUpperCase().replace('0X', '0x'), 'Ada')
    assert.equal((sink.last as StateMessage).you?.wallet, ADA)
  })
})

describe('guests', () => {
  test('a guest may connect and watch', () => {
    const { sink } = helloAs(ADA, 'Guest', true)
    const state = sink.last as StateMessage
    assert.equal(state.t, 'state')
    assert.equal(state.you?.canWrite, false)
  })

  test('a guest cannot write a carer event', () => {
    const { sink, handle } = helloAs(ADA, 'Guest', true)
    for (const message of [{ t: 'feed' }, { t: 'pet' }, { t: 'stamp' }]) {
      handle.receive(message)
    }
    assert.equal(countCarers(), 0)
    assert.equal(sink.errors.length, 3)
    for (const error of sink.errors) assert.equal(error.code, 'guest_read_only')
  })

  test('a guest cannot write a chain move', () => {
    const { sink, handle } = helloAs(ADA, 'Guest', true)
    handle.receive({ t: 'teach', emoteId: 'dance', wearables: [] })
    assert.equal(countChain(), 0)
    assert.equal(sink.errors[0]?.code, 'guest_read_only')
  })

  test('a guest cannot change the size', () => {
    const { handle } = helloAs(ADA, 'Guest', true)
    handle.receive({ t: 'feed' })
    assert.equal(store.readPet(clock).feedCount, 0)
  })

  test('the same wallet, not a guest, writes normally — only the flag decides', () => {
    const { handle } = helloAs(ADA, 'Ada', false)
    handle.receive({ t: 'feed' })
    assert.equal(countCarers(), 1)
  })
})

describe('writes before hello', () => {
  test('every mutating message is refused until the handshake lands', () => {
    const { sink, handle } = connect()
    for (const message of [
      { t: 'feed' },
      { t: 'pet' },
      { t: 'stamp' },
      { t: 'teach', emoteId: 'dance', wearables: [] }
    ]) {
      handle.receive(message)
    }
    assert.equal(countCarers(), 0)
    assert.equal(countChain(), 0)
    assert.equal(sink.errors.length, 4)
    for (const error of sink.errors) assert.equal(error.code, 'hello_required')
  })
})

describe('feeding', () => {
  test('the server owns the size: it is the count of feedings, and the client never sends it', () => {
    const { handle } = helloAs(ADA, 'Ada')
    handle.receive({ t: 'feed' })
    handle.receive({ t: 'feed' })
    assert.equal(store.readPet(clock).feedCount, 2)

    // A client that tries to declare a size is simply not speaking the protocol.
    handle.receive({ t: 'feed', feedCount: 9999, hunger: 1 })
    assert.equal(store.readPet(clock).feedCount, 3)
  })

  test('feeding credits the plaque with the feeder', () => {
    helloAs(ADA, 'Ada').handle.receive({ t: 'feed' })
    assert.equal(store.readPet(clock).lastFedBy, 'Ada')
  })

  test('hunger rises from its decayed value, not from whatever was last stored', () => {
    const { handle } = helloAs(ADA, 'Ada')
    handle.receive({ t: 'feed' })
    const afterFirst = store.readPet(clock).hunger

    clock += 18 * 3_600_000 // half the decay window
    const decayed = store.readPet(clock).hunger
    assert.ok(decayed < afterFirst)

    handle.receive({ t: 'feed' })
    const afterSecond = store.readPet(clock).hunger
    assert.ok(Math.abs(afterSecond - (decayed + config.hunger.feedGain)) < 1e-9)
  })
})

describe('teaching', () => {
  test('a move is appended with its teacher and their wearables', () => {
    const { handle } = helloAs(ADA, 'Ada')
    handle.receive({ t: 'teach', emoteId: 'dance', wearables: ['urn:hat', 'urn:boots'] })

    const chain = store.recentChain(10)
    assert.equal(chain.length, 1)
    assert.equal(chain[0]?.emoteId, 'dance')
    assert.equal(chain[0]?.teacherName, 'Ada')
    assert.deepEqual(chain[0]?.wearables, ['urn:hat', 'urn:boots'])
    assert.equal(chain[0]?.isSeed, false)
  })

  test('teaching also counts as tending', () => {
    helloAs(ADA, 'Ada').handle.receive({ t: 'teach', emoteId: 'clap', wearables: [] })
    assert.equal(countCarers(), 1)
  })

  test('the chain keeps its order across teachers', () => {
    helloAs(ADA, 'Ada').handle.receive({ t: 'teach', emoteId: 'a', wearables: [] })
    clock += 1000
    helloAs(KITO, 'Kito').handle.receive({ t: 'teach', emoteId: 'b', wearables: [] })

    assert.deepEqual(
      store.recentChain(10).map((m) => [m.seq, m.emoteId, m.teacherName]),
      [
        [1, 'a', 'Ada'],
        [2, 'b', 'Kito']
      ]
    )
  })

  test('a teach without an emote id is not a message at all', () => {
    const { sink, handle } = helloAs(ADA, 'Ada')
    handle.receive({ t: 'teach', emoteId: '', wearables: [] })
    assert.equal(sink.errors[0]?.code, 'bad_message')
    assert.equal(countChain(), 0)
  })

  test('an oversized wearable list is truncated rather than refused', () => {
    const { handle } = helloAs(ADA, 'Ada')
    handle.receive({ t: 'teach', emoteId: 'dance', wearables: new Array(200).fill('urn:x') })
    assert.equal(store.recentChain(1)[0]?.wearables.length, 24)
  })
})

describe('rate limiting through the room', () => {
  test('a wallet that hammers feed is cut off and told when to come back', () => {
    const { sink, handle } = helloAs(ADA, 'Ada')
    for (let i = 0; i < config.limits.feed + 5; i++) handle.receive({ t: 'feed' })

    assert.equal(store.readPet(clock).feedCount, config.limits.feed)
    assert.equal(countCarers(), config.limits.feed)

    const refusal = sink.errors[0]
    assert.equal(refusal?.code, 'rate_limited')
    assert.ok((refusal?.retryAt ?? 0) > clock)
  })

  test('a refused message writes nothing at all', () => {
    const { handle } = helloAs(ADA, 'Ada')
    for (let i = 0; i < 100; i++) handle.receive({ t: 'teach', emoteId: 'dance', wearables: [] })
    assert.equal(countChain(), config.limits.teach)
  })

  test('opening a second connection does not buy more allowance', () => {
    const first = helloAs(ADA, 'Ada')
    for (let i = 0; i < config.limits.feed; i++) first.handle.receive({ t: 'feed' })

    const second = helloAs(ADA, 'Ada')
    second.handle.receive({ t: 'feed' })

    assert.equal(store.readPet(clock).feedCount, config.limits.feed)
    assert.equal(second.sink.errors[0]?.code, 'rate_limited')
  })

  test('one griefer does not stop anybody else feeding', () => {
    const griefer = helloAs(ADA, 'Ada')
    for (let i = 0; i < config.limits.feed + 10; i++) griefer.handle.receive({ t: 'feed' })

    const bystander = helloAs(KITO, 'Kito')
    bystander.handle.receive({ t: 'feed' })

    assert.equal(bystander.sink.errors.length, 0)
    assert.equal(store.readPet(clock).lastFedBy, 'Kito')
  })
})

describe('broadcasts', () => {
  test('everyone present is told when anybody acts', () => {
    const watcher = helloAs(KITO, 'Kito')
    const actor = helloAs(ADA, 'Ada')

    const before = watcher.sink.states.length
    actor.handle.receive({ t: 'feed' })

    const after = watcher.sink.states
    assert.equal(after.length, before + 1)
    assert.equal(after[after.length - 1]?.pet.feedCount, 1)
  })

  test('a departed connection stops receiving', () => {
    const watcher = helloAs(KITO, 'Kito')
    const actor = helloAs(ADA, 'Ada')
    watcher.handle.close()

    const before = watcher.sink.states.length
    actor.handle.receive({ t: 'feed' })
    assert.equal(watcher.sink.states.length, before)
  })

  test('one broken connection does not stop the others being told', () => {
    const exploding: Sink = {
      send() {
        throw new Error('socket is gone')
      }
    }
    room.connect(exploding)
    const watcher = helloAs(KITO, 'Kito')
    const actor = helloAs(ADA, 'Ada')

    const before = watcher.sink.states.length
    actor.handle.receive({ t: 'feed' })
    assert.equal(watcher.sink.states.length, before + 1)
  })
})

describe('malformed input', () => {
  test('junk is refused without touching either log', () => {
    const { sink, handle } = helloAs(ADA, 'Ada')
    for (const junk of [null, undefined, 42, 'feed', [], { t: 'drop_table' }, {}]) {
      handle.receive(junk)
    }
    assert.equal(countCarers(), 0)
    assert.equal(countChain(), 0)
    assert.equal(sink.errors.length, 7)
    for (const error of sink.errors) assert.equal(error.code, 'bad_message')
  })
})
