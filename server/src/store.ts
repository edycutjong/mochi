/**
 * Every read and write the game logic is allowed to make.
 *
 * All SQL lives here. The game rules live in `game.ts` and never see a
 * statement, which is what lets the away-line — the one query in this system
 * that is worth getting exactly right — be read, reasoned about and tested on
 * its own.
 */

import type { DatabaseSync } from 'node:sqlite'

import type { AwayLine, CarerDto, ChainMoveDto, MutatingKind, PetState } from './protocol.js'
import type { HungerConfig } from './config.js'
import { hungerAfterFeed, hungerAt } from './hunger.js'

interface PetRow {
  hunger: number
  feed_count: number
  last_fed_at: number
  last_fed_by: string
}

interface ChainRow {
  seq: number
  emote_id: string
  teacher_name: string
  wearables: string
  taught_at: number
  is_seed: number
}

interface CarerRow {
  name: string
  kind: string
  at: number
  is_seed: number
}

export interface CarerWrite {
  wallet: string
  name: string
  kind: MutatingKind
  at: number
  /** Marks a row produced during the opening community seeding drive. */
  isSeed?: boolean
}

export interface TeachWrite extends Omit<CarerWrite, 'kind'> {
  emoteId: string
  wearables: string[]
}

export class Store {
  constructor(
    private readonly db: DatabaseSync,
    private readonly hunger: HungerConfig
  ) {}

  // -------------------------------------------------------------------------
  // Derived pet state
  // -------------------------------------------------------------------------

  /**
   * The creature as it is right now.
   *
   * Hunger is aged on the way out rather than on a timer, so the value is
   * correct on the first read after any length of downtime.
   */
  readPet(now: number): PetState {
    const row = this.db.prepare('SELECT * FROM pet WHERE id = 1').get() as unknown as PetRow | undefined
    if (!row) throw new Error('pet row missing: the database was not initialised')

    return {
      hunger: hungerAt(row.hunger, row.last_fed_at, now, this.hunger),
      feedCount: row.feed_count,
      lastFedAt: row.last_fed_at,
      lastFedBy: row.last_fed_by
    }
  }

  /**
   * Apply one feeding.
   *
   * Three things happen together or not at all: hunger rises from its *decayed*
   * value (not from whatever was last stored), the size — which is the literal
   * count of every feeding ever — goes up by one, and the carer is credited.
   */
  feed(write: CarerWrite): PetState {
    return this.transaction(() => {
      const row = this.db.prepare('SELECT * FROM pet WHERE id = 1').get() as unknown as PetRow
      const current = hungerAt(row.hunger, row.last_fed_at, write.at, this.hunger)
      const next = hungerAfterFeed(current, this.hunger)

      this.db
        .prepare('UPDATE pet SET hunger = ?, feed_count = feed_count + 1, last_fed_at = ?, last_fed_by = ? WHERE id = 1')
        .run(next, write.at, write.name)

      this.logCarer(write)
      return this.readPet(write.at)
    })
  }

  // -------------------------------------------------------------------------
  // The append-only logs
  // -------------------------------------------------------------------------

  /**
   * Append one move to the communal dance chain.
   *
   * The teacher's name is written into the move itself, not looked up later:
   * the credit has to survive even if that person never returns. A teach is
   * also a carer event, so teaching counts as tending.
   */
  teach(write: TeachWrite): number {
    return this.transaction(() => {
      const result = this.db
        .prepare(
          `INSERT INTO chain_move (emote_id, teacher_id, teacher_name, wearables, taught_at, is_seed)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(write.emoteId, write.wallet, write.name, JSON.stringify(write.wearables), write.at, write.isSeed ? 1 : 0)

      this.logCarer({ ...write, kind: 'teach' })
      return Number(result.lastInsertRowid)
    })
  }

  /** Record that somebody tended the creature. Every mutating intent lands here. */
  logCarer(write: CarerWrite): void {
    this.db
      .prepare('INSERT INTO carer_event (wallet, name, kind, at, is_seed) VALUES (?, ?, ?, ?, ?)')
      .run(write.wallet, write.name, write.kind, write.at, write.isSeed ? 1 : 0)
  }

  // -------------------------------------------------------------------------
  // The away-line
  // -------------------------------------------------------------------------

  /**
   * The named person whose act followed yours.
   *
   * Read in two steps because that is literally the question: *when did you
   * last touch this creature*, and *who was the very next person after that*.
   *
   *  - No previous event for this wallet → no away-line. A first-time visitor
   *    is not owed a sentence about somebody following them, and inventing one
   *    would be the only dishonest string in the product.
   *  - Only your own later events → no away-line. Following yourself is not a
   *    social fact, which is why the wallet is excluded rather than the row id.
   *  - Ties on the same millisecond resolve by insertion order, so the answer
   *    is stable across restarts and identical for every caller.
   *
   * Seeded rows are included deliberately. The `is_seed` flag marks when a row
   * was produced, not whether the person behind it was real; every one of them
   * is a real wallet that really performed the act, so excluding them here
   * would hide true history.
   */
  awayLine(wallet: string, opts: { at?: number } = {}): AwayLine | null {
    const mine = this.db.prepare('SELECT MAX(at) AS at FROM carer_event WHERE wallet = ?').get(wallet) as unknown as
      | { at: number | null }
      | undefined

    const lastMine = opts.at ?? mine?.at ?? null
    if (lastMine === null) return null

    const row = this.db
      .prepare(
        `SELECT name, kind, at FROM carer_event
         WHERE wallet != ? AND at > ?
         ORDER BY at ASC, id ASC
         LIMIT 1`
      )
      .get(wallet, lastMine) as unknown as CarerRow | undefined

    if (!row) return null
    return { name: row.name, kind: row.kind as MutatingKind, at: row.at }
  }

  // -------------------------------------------------------------------------
  // Reads for the `state` message
  // -------------------------------------------------------------------------

  /** The tail of the chain, oldest first — replay order. */
  recentChain(limit: number): ChainMoveDto[] {
    const rows = this.db
      .prepare('SELECT * FROM (SELECT * FROM chain_move ORDER BY seq DESC LIMIT ?) ORDER BY seq ASC')
      .all(limit) as unknown as ChainRow[]

    return rows.map((row) => ({
      seq: row.seq,
      emoteId: row.emote_id,
      teacherName: row.teacher_name,
      wearables: parseWearables(row.wearables),
      taughtAt: row.taught_at,
      isSeed: row.is_seed === 1
    }))
  }

  chainLength(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS n FROM chain_move').get() as unknown as { n: number }
    return row.n
  }

  /** Carer events since a cutoff, most recent first — the plaque. */
  carersSince(since: number, limit = 50): CarerDto[] {
    const rows = this.db
      .prepare('SELECT name, kind, at, is_seed FROM carer_event WHERE at >= ? ORDER BY at DESC, id DESC LIMIT ?')
      .all(since, limit) as unknown as CarerRow[]

    return rows.map((row) => ({
      name: row.name,
      kind: row.kind as MutatingKind,
      at: row.at,
      isSeed: row.is_seed === 1
    }))
  }

  /** Distinct wallets that have ever tended the creature. */
  carerCount(): number {
    const row = this.db.prepare('SELECT COUNT(DISTINCT wallet) AS n FROM carer_event').get() as unknown as { n: number }
    return row.n
  }

  /** Most recent event by one wallet, or null. Used by the tests and the fixture. */
  lastEventAt(wallet: string): number | null {
    const row = this.db.prepare('SELECT MAX(at) AS at FROM carer_event WHERE wallet = ?').get(wallet) as unknown as {
      at: number | null
    }
    return row?.at ?? null
  }

  // -------------------------------------------------------------------------

  private transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN')
    try {
      const result = fn()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }
}

/**
 * Wearables are stored as JSON text. A row written by an older build, or by
 * hand, must not be able to break a `state` broadcast — so a value that will
 * not parse degrades to an undressed dancer rather than throwing.
 */
function parseWearables(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is string => typeof entry === 'string')
  } catch {
    return []
  }
}
