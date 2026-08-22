/**
 * End-to-end over a real socket.
 *
 * The rules are covered against the room directly; this file only proves the
 * wiring — that a real WebSocket client gets a real `state` back, that a guest
 * is still refused when the refusal has to travel over the wire, and that the
 * health endpoint an uptime monitor polls actually answers.
 */

import { test, describe, beforeAll, afterAll } from 'vitest'
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

/** Open a socket, send everything, and collect replies until it goes quiet. */
function exchange(messages: unknown[], expected: number): Promise<ServerMessage[]> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`)
    const received: ServerMessage[] = []
    const timer = setTimeout(() => {
      socket.close()
      reject(new Error(`timed out after ${received.length}/${expected} replies`))
    }, 4000)

    socket.on('open', () => {
      for (const message of messages) socket.send(JSON.stringify(message))
    })
    socket.on('message', (data) => {
      received.push(JSON.parse(frameText(data)) as ServerMessage)
      if (received.length >= expected) {
        clearTimeout(timer)
        socket.close()
        resolve(received)
      }
    })
    socket.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

describe('websocket transport', () => {
  test('a real client gets the world back on hello', async () => {
    const [reply] = await exchange([{ t: 'hello', wallet: ADA, name: 'Ada', isGuest: false }], 1)
    const state = reply as StateMessage
    assert.equal(state.t, 'state')
    assert.equal(state.you?.canWrite, true)
    assert.equal(typeof state.now, 'number')
  })

  test('a guest is refused over the wire, not only in the room', async () => {
    const replies = await exchange(
      [
        { t: 'hello', wallet: ADA, name: 'Guest', isGuest: true },
        { t: 'feed' }
      ],
      2
    )
    assert.equal(replies[0]?.t, 'state')
    assert.equal(replies[1]?.t, 'error')
    assert.equal(replies[1]?.t === 'error' && replies[1].code, 'guest_read_only')
  })

  test('a non-JSON frame is answered, not fatal', async () => {
    const replies = await new Promise<ServerMessage[]>((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}`)
      const received: ServerMessage[] = []
      const timer = setTimeout(() => reject(new Error('timed out')), 4000)
      socket.on('open', () => socket.send('this is not json'))
      socket.on('message', (data) => {
        received.push(JSON.parse(frameText(data)) as ServerMessage)
        clearTimeout(timer)
        socket.close()
        resolve(received)
      })
      socket.on('error', reject)
    })
    assert.equal(replies[0]?.t === 'error' && replies[0].code, 'bad_message')
  })

  test('the health endpoint answers for an uptime monitor', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/health`)
    assert.equal(response.status, 200)
    const body = (await response.json()) as { ok: boolean; feedCount: number; hungerFloor: number }
    assert.equal(body.ok, true)
    assert.equal(typeof body.feedCount, 'number')
    assert.equal(body.hungerFloor, config.hunger.floor)
  })

  test('an unknown path is a plain 404', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/nope`)
    assert.equal(response.status, 404)
  })
})
