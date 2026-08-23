/**
 * The transport: an HTTP server for health checks with a WebSocket room on top.
 *
 * This file is the only one that knows the game is played over a socket. It
 * parses frames, hands them to the `Room`, and writes back whatever the room
 * decides. No rule lives here.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { WebSocketServer, type RawData, type WebSocket } from 'ws'

import type { Room } from './game.js'
import type { Config } from './config.js'
import { fullToFloorMs } from './hunger.js'
import type { ServerMessage } from './protocol.js'

/** Largest frame accepted, in bytes. A `teach` with full wearables is ~4 KB. */
const MAX_PAYLOAD_BYTES = 32 * 1024

/** How often dead connections are reaped. */
const HEARTBEAT_MS = 30_000

/**
 * Decode an inbound frame to text.
 *
 * `ws` types a message as `Buffer | ArrayBuffer | Buffer[]`, and only the first
 * of those survives a bare `.toString()`: an `ArrayBuffer` stringifies to the
 * literal `"[object ArrayBuffer]"`, and an array of fragments comma-joins.
 * Both would reach `JSON.parse` as garbage and be answered with `bad_message`,
 * so a fragmented or binary-typed frame would look to the client like a
 * malformed one. Normalise all three shapes instead.
 */
function frameToText(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8')
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8')
  return data.toString('utf8')
}

export interface Transport {
  http: Server
  wss: WebSocketServer
  /** Resolves once the listener is bound. */
  listen(): Promise<{ port: number }>
  close(): Promise<void>
}

export function createTransport(room: Room, config: Config): Transport {
  const startedAt = Date.now()

  const http = createServer((req, res) => handleHttp(req, res, room, config, startedAt))
  const wss = new WebSocketServer({ server: http, maxPayload: MAX_PAYLOAD_BYTES })

  const alive = new WeakMap<WebSocket, boolean>()

  wss.on('connection', (socket: WebSocket) => {
    alive.set(socket, true)
    socket.on('pong', () => alive.set(socket, true))

    const connection = room.connect({
      send: (message: ServerMessage) => {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message))
      }
    })

    socket.on('message', (data) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(frameToText(data))
      } catch {
        // Not JSON at all. Let the room answer with its own `bad_message`
        // rather than inventing a second vocabulary for the same refusal.
        parsed = null
      }
      // Contained deliberately. This runs inside an EventEmitter listener, so an
      // exception escaping here is an unhandled throw that exits the process —
      // and the mutations reachable from `receive` can throw for reasons that
      // have nothing to do with the visitor: SQLITE_BUSY, a full disk, a missing
      // pet row. Fly would restart within its 30s health check, but this server
      // is meant to sit unattended for the judging window, where a repeatable
      // trigger becomes a crash loop with nobody watching. One visitor sending
      // one unlucky frame should cost that frame, not everyone's session.
      try {
        connection.receive(parsed)
      } catch (error) {
        console.error('receive failed', error)
        if (socket.readyState === socket.OPEN) {
          socket.send(
            JSON.stringify({
              t: 'error',
              code: 'bad_message',
              message: 'that did not go through'
            } satisfies ServerMessage)
          )
        }
      }
    })

    socket.on('close', () => connection.close())
    socket.on('error', () => connection.close())
  })

  // A phone that walks out of range stops reading without closing. Without this
  // the room accumulates ghosts and broadcasts to nobody for the rest of the
  // process's life — which, here, is meant to be weeks.
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (alive.get(socket) === false) {
        socket.terminate()
        continue
      }
      alive.set(socket, false)
      socket.ping()
    }
  }, HEARTBEAT_MS)
  heartbeat.unref()

  return {
    http,
    wss,
    listen: () =>
      new Promise((resolve, reject) => {
        http.once('error', reject)
        http.listen(config.port, config.host, () => {
          const address = http.address()
          resolve({ port: typeof address === 'object' && address ? address.port : config.port })
        })
      }),
    close: () =>
      new Promise((resolve) => {
        clearInterval(heartbeat)
        for (const socket of wss.clients) socket.terminate()
        wss.close(() => http.close(() => resolve()))
      })
  }
}

/**
 * Two endpoints, both read-only.
 *
 * `/health` is what an external uptime monitor polls; `/state` is the same view
 * the scene gets, over plain HTTP, so the world can be inspected from a browser
 * without a WebSocket client.
 */
function handleHttp(req: IncomingMessage, res: ServerResponse, room: Room, config: Config, startedAt: number): void {
  const path = (req.url ?? '/').split('?')[0]

  if (req.method !== 'GET') {
    json(res, 405, { error: 'method not allowed' })
    return
  }

  switch (path) {
    case '/health': {
      const state = room.buildState()
      json(res, 200, {
        ok: true,
        uptimeMs: Date.now() - startedAt,
        connections: room.connectionCount,
        feedCount: state.pet.feedCount,
        chainLength: state.chainLength,
        carerCount: state.carerCount,
        hungerFloor: config.hunger.floor,
        fullToFloorMs: fullToFloorMs(config.hunger)
      })
      return
    }

    case '/state':
      json(res, 200, room.buildState())
      return

    default:
      json(res, 404, { error: 'not found' })
  }
}

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    // Both routes are public, read-only projections of state the world already
    // shows to anyone who walks in — a creature's size and the names of the
    // people who fed it. Nothing here is private, there is no session and no
    // cookie to protect, and every write goes over the WebSocket after a
    // wallet handshake rather than through this handler.
    //
    // Opening them means the numbers can be read from a browser: a page can
    // show the real carer count instead of a screenshot of one. A judge can
    // also curl them and check the figures quoted in the README against the
    // running server.
    'access-control-allow-origin': '*'
  })
  res.end(payload)
}
