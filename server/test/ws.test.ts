/**
 * The branches transport.test.ts's happy path doesn't reach.
 *
 * transport.test.ts proves the wiring works end-to-end; this file targets the
 * three inbound frame shapes `frameToText` normalises (only the plain-text
 * `Buffer` path is exercised there), the heartbeat reaper that drops a dead
 * connection, and the HTTP routes its own tests don't hit (`/state`, a
 * non-GET method).
 */

import { test, describe, beforeAll, afterAll, vi } from 'vitest'
import assert from 'node:assert/strict'
import { WebSocket, type RawData } from 'ws'

import { openDatabase } from '../src/db.js'
import { Store } from '../src/store.js'
import { Room } from '../src/game.js'
import { createTransport, type Transport } from '../src/ws.js'
import { testConfig } from '../src/config.js'
import type { ServerMessage, StateMessage } from '../src/protocol.js'

const ADA = '0x' + 'a1'.repeat(20)
const config = testConfig({ host: '127.0.0.1', port: 0 })

/** Mirrors `frameToText` in src/ws.ts — see the note there on why `.toString()` alone is wrong. */
function frameText(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8')
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8')
  return data.toString('utf8')
}

let db: ReturnType<typeof openDatabase>
let transport: Transport
let port = 0

beforeAll(async () => {
  db = openDatabase({ path: ':memory:' })
  const room = new Room(new Store(db, config.hunger), config)
  transport = createTransport(room, config)
  port = (await transport.listen()).port
})

afterAll(async () => {
  await transport.close()
  db.close()
})

function waitForOpen(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once('open', () => resolve())
    socket.once('error', reject)
  })
}

/** The next reply on a socket, decoded. */
function nextMessage(socket: WebSocket): Promise<ServerMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out waiting for a reply')), 4000)
    socket.once('message', (data) => {
      clearTimeout(timer)
      resolve(JSON.parse(frameText(data)) as ServerMessage)
    })
    socket.once('error', reject)
  })
}

describe('frameToText frame shapes', () => {
  test('a plain string frame is decoded straight off the Buffer', async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`)
    await waitForOpen(socket)
    const reply = nextMessage(socket)

    socket.send(JSON.stringify({ t: 'hello', wallet: ADA, name: 'Cate', isGuest: false }))

    const state = (await reply) as StateMessage
    assert.equal(state.t, 'state')
    assert.equal(state.you?.name, 'Cate')
    socket.close()
  })

  test('a non-JSON frame is answered with bad_message, not left to throw', async () => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`)
    await waitForOpen(socket)
    const reply = nextMessage(socket)

    socket.send('this is not json')

    const message = await reply
    assert.equal(message.t === 'error' && message.code, 'bad_message')
    socket.close()
  })

  test('a binary ArrayBuffer frame is decoded the same as a plain-text one', async () => {
    // The shape a frame arrives in on `message` depends on the *receiving*
    // socket's `binaryType` — set it on the server-side socket for this one
    // connection so the frame that reaches `frameToText` is an ArrayBuffer.
    transport.wss.once('connection', (socket) => {
      socket.binaryType = 'arraybuffer'
    })

    const socket = new WebSocket(`ws://127.0.0.1:${port}`)
    await waitForOpen(socket)
    const reply = nextMessage(socket)

    // A Buffer is non-string, so `ws` sends it as a binary frame automatically.
    const payload = Buffer.from(JSON.stringify({ t: 'hello', wallet: ADA, name: 'Ada', isGuest: false }))
    socket.send(payload)

    const state = (await reply) as StateMessage
    assert.equal(state.t, 'state')
    assert.equal(state.you?.canWrite, true)
    socket.close()
  })

  test('a fragmented binary frame (Buffer[]) is decoded the same as a plain-text one', async () => {
    transport.wss.once('connection', (socket) => {
      socket.binaryType = 'fragments'
    })

    const socket = new WebSocket(`ws://127.0.0.1:${port}`)
    await waitForOpen(socket)
    const reply = nextMessage(socket)

    // Two `send` calls with `fin: false` then `fin: true` produce one message
    // split across wire fragments; `ws` hands those back as `Buffer[]` when
    // the receiving socket's `binaryType` is `'fragments'`.
    const payload = Buffer.from(JSON.stringify({ t: 'hello', wallet: ADA, name: 'Bea', isGuest: false }))
    const mid = Math.floor(payload.length / 2)
    socket.send(payload.subarray(0, mid), { fin: false })
    socket.send(payload.subarray(mid), { fin: true })

    const state = (await reply) as StateMessage
    assert.equal(state.t, 'state')
    assert.equal(state.you?.name, 'Bea')
    socket.close()
  })
})

describe('http routes', () => {
  test('a non-GET request is a plain 405, not routed', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/health`, { method: 'POST' })
    assert.equal(response.status, 405)
    const body = (await response.json()) as { error: string }
    assert.equal(body.error, 'method not allowed')
  })

  test('/health answers with uptime and world summary for an uptime monitor', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/health`)
    assert.equal(response.status, 200)
    const body = (await response.json()) as { ok: boolean; feedCount: number; hungerFloor: number }
    assert.equal(body.ok, true)
    assert.equal(typeof body.feedCount, 'number')
    assert.equal(body.hungerFloor, config.hunger.floor)
  })

  test('/state answers the same world a socket would get, over plain HTTP', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/state`)
    assert.equal(response.status, 200)
    const body = (await response.json()) as { t: string; chainLength: number }
    assert.equal(body.t, 'state')
    assert.equal(typeof body.chainLength, 'number')
  })

  test('an unknown path is a plain 404', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/nope`)
    assert.equal(response.status, 404)
  })

  test('a request whose url is missing on the wire falls back to the root path', async () => {
    const localDb = openDatabase({ path: ':memory:' })
    const localTransport = createTransport(new Room(new Store(localDb, config.hunger), config), config)
    const localPort = (await localTransport.listen()).port

    // A real HTTP client always sets `req.url`. `IncomingMessage.url` is only
    // typed optional for the rare case Node's own types admit it can be
    // absent — simulate that ahead of the transport's own listener so
    // `path = (req.url ?? '/').split('?')[0]` takes its fallback branch.
    localTransport.http.prependListener('request', (req) => {
      req.url = undefined
    })

    try {
      const response = await fetch(`http://127.0.0.1:${localPort}/state`)
      // Whatever path the client asked for, the fallback path is `/`, which
      // matches neither `/health` nor `/state` — the same 404 as an unknown path.
      assert.equal(response.status, 404)
    } finally {
      await localTransport.close()
      localDb.close()
    }
  })
})

describe('heartbeat reaper', () => {
  test('a connection that stops answering pings is terminated on the next sweep', async () => {
    // The reaper ticks every 30s of real time, which nothing else in this
    // suite can afford to wait on. Fake only the interval so `setTimeout`,
    // sockets, and the rest of the event loop keep running for real — the
    // ping/pong round trip below depends on actual I/O completing.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })

    const heartbeatDb = openDatabase({ path: ':memory:' })
    const heartbeatRoom = new Room(new Store(heartbeatDb, config.hunger), config)
    const heartbeatTransport = createTransport(heartbeatRoom, config)

    try {
      const heartbeatPort = (await heartbeatTransport.listen()).port

      // `autoPong: false` is the documented way to stop `ws` answering pings
      // automatically, which is what lets this connection go quiet.
      const responsive = new WebSocket(`ws://127.0.0.1:${heartbeatPort}`)
      const silent = new WebSocket(`ws://127.0.0.1:${heartbeatPort}`, { autoPong: false })
      await Promise.all([waitForOpen(responsive), waitForOpen(silent)])

      while (heartbeatTransport.wss.clients.size < 2) {
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      const silentClosed = new Promise<void>((resolve) => silent.once('close', () => resolve()))

      // First sweep: both connections are marked alive from connecting, so
      // neither is terminated — both are pinged and marked not-alive.
      vi.advanceTimersByTime(30_000)
      // Let the real ping/pong round trip complete: `responsive` re-marks
      // itself alive over the wire; `silent` never does.
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Second sweep: `responsive` was re-armed by its pong and is pinged
      // again; `silent` is still not-alive from the first sweep and is
      // terminated.
      vi.advanceTimersByTime(30_000)

      await silentClosed
      assert.equal(silent.readyState, WebSocket.CLOSED)
      assert.equal(responsive.readyState, WebSocket.OPEN)

      responsive.close()
    } finally {
      vi.useRealTimers()
      await heartbeatTransport.close()
      heartbeatDb.close()
    }
  })
})

describe('listen()', () => {
  test('an address that is not a bound TCP socket falls back to the configured port', async () => {
    const localDb = openDatabase({ path: ':memory:' })
    const localTransport = createTransport(new Room(new Store(localDb, config.hunger), config), config)

    // `http.address()` only returns an `AddressInfo` object while genuinely
    // bound to a TCP host:port, which is the only way this transport ever
    // calls `listen()`. Simulate the one other shape the type admits — `null`,
    // as it would be for a socket that isn't (yet) listening — so
    // `typeof address === 'object' && address ? address.port : config.port`
    // takes its `config.port` branch.
    localTransport.http.address = () => null

    try {
      const result = await localTransport.listen()
      assert.equal(result.port, config.port)
    } finally {
      await localTransport.close()
      localDb.close()
    }
  })
})
