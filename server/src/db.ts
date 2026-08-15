/**
 * The database: schema, migration and connection.
 *
 * SQLite in a single file, through Node's built-in `node:sqlite`. One writer,
 * a dataset measured in kilobytes, and no service to keep alive next to the
 * game server — anything larger would be ceremony. The file path is
 * configurable so the tests can run against `:memory:` and the host can put the
 * real file on a mounted volume.
 *
 * The shape below is the whole data model: one row of derived state, and two
 * append-only logs that everything else is rendered from.
 */

import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export const SCHEMA = `
-- the single row of derived pet state
CREATE TABLE IF NOT EXISTS pet (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  hunger        REAL    NOT NULL,   -- 0..1, decays to a floor over ~36h
  feed_count    INTEGER NOT NULL,   -- size IS this number
  last_fed_at   INTEGER NOT NULL,
  last_fed_by   TEXT    NOT NULL    -- display name, drives the plaque
);

-- the append-only log everything else renders from
CREATE TABLE IF NOT EXISTS chain_move (
  seq          INTEGER PRIMARY KEY AUTOINCREMENT,
  emote_id     TEXT    NOT NULL,
  teacher_id   TEXT    NOT NULL,     -- wallet
  teacher_name TEXT    NOT NULL,     -- NEVER null: an anonymous chain is a leaderboard
  wearables    TEXT    NOT NULL,     -- JSON, dresses the memory dancer
  taught_at    INTEGER NOT NULL,
  is_seed      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS carer_event (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet    TEXT    NOT NULL,
  name      TEXT    NOT NULL,
  kind      TEXT    NOT NULL CHECK (kind IN ('feed','teach','pet','stamp')),
  at        INTEGER NOT NULL,
  is_seed   INTEGER NOT NULL DEFAULT 0
);

-- the away-line reads the carer log by wallet and then by time, in that order
CREATE INDEX IF NOT EXISTS carer_event_wallet_at ON carer_event (wallet, at);
CREATE INDEX IF NOT EXISTS carer_event_at ON carer_event (at);
`

/**
 * The creature before anybody has touched it.
 *
 * It starts hungry rather than full: the first thing a visitor should be able
 * to do is help. `last_fed_by` is a placeholder the first real feeding replaces
 * for good, and it is never presented as a person.
 */
export const GENESIS = {
  hunger: 0.35,
  feedCount: 0,
  lastFedBy: 'nobody yet'
} as const

export interface OpenOptions {
  /** File path, or `:memory:`. */
  path: string
  /** Epoch ms used for the genesis row. Injectable so tests are deterministic. */
  now?: number
}

/**
 * Open (creating if needed) the database and apply the schema.
 *
 * Safe to call against an existing file: every statement is `IF NOT EXISTS`, so
 * a restart re-attaches to the accumulated history instead of resetting it.
 */
export function openDatabase(options: OpenOptions): DatabaseSync {
  if (options.path !== ':memory:') {
    mkdirSync(dirname(options.path), { recursive: true })
  }

  const db = new DatabaseSync(options.path)

  // WAL survives an unclean shutdown far better than the rollback journal, and
  // lets the health check read while a write is in flight. NORMAL synchronous
  // is the usual companion: durable across a process crash, which is the case
  // we care about, at a fraction of the fsync cost of FULL.
  if (options.path !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL')
    db.exec('PRAGMA synchronous = NORMAL')
  }
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(SCHEMA)

  const now = options.now ?? Date.now()
  db.prepare(
    `INSERT OR IGNORE INTO pet (id, hunger, feed_count, last_fed_at, last_fed_by)
     VALUES (1, ?, ?, ?, ?)`
  ).run(GENESIS.hunger, GENESIS.feedCount, now, GENESIS.lastFedBy)

  return db
}
