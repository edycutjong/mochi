/**
 * Entry point.
 *
 * Open the database, build the room, bind the socket, and stay up. The server
 * is expected to run for weeks without attention, so the only two things this
 * file does beyond wiring are: refuse to start silently on a bad port, and shut
 * down cleanly enough that SQLite is never left mid-write.
 */

import { loadConfig } from './config.js'
import { openDatabase } from './db.js'
import { Store } from './store.js'
import { Room } from './game.js'
import { createTransport } from './ws.js'

async function main(): Promise<void> {
  const config = loadConfig()

  const db = openDatabase({ path: config.dbPath })
  const store = new Store(db, config.hunger)
  const room = new Room(store, config)
  const transport = createTransport(room, config)

  const { port } = await transport.listen()

  const state = room.buildState()
  console.log(
    `mochi-server listening on ${config.host}:${port} · db=${config.dbPath} · ` +
      `feedings=${state.pet.feedCount} chain=${state.chainLength} carers=${state.carerCount}`
  )

  let closing = false
  const shutdown = async (signal: string): Promise<void> => {
    if (closing) return
    closing = true
    console.log(`received ${signal}, shutting down`)
    try {
      await transport.close()
      db.close()
    } finally {
      process.exit(0)
    }
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((error: unknown) => {
  console.error('mochi-server failed to start:', error)
  process.exit(1)
})
