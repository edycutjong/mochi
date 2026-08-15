/**
 * Runtime configuration.
 *
 * Everything is an environment variable with a safe default, so the server runs
 * with `npm start` and no setup at all, and every tunable can still be changed
 * on the host without a rebuild. Nothing secret lives here — the server has no
 * credentials of its own.
 */

import type { MutatingKind } from './protocol.js'

function readInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function readFloat(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function readString(name: string, fallback: string): string {
  const raw = process.env[name]
  return raw === undefined || raw.trim() === '' ? fallback : raw.trim()
}

/** Per-wallet, per-minute caps on each mutating message. */
export interface RateLimits {
  feed: number
  teach: number
  pet: number
  stamp: number
}

export interface HungerConfig {
  /**
   * Hours from a full belly down to the floor.
   *
   * Long on purpose. A creature tended by strangers has to still be hungry when
   * you come back tomorrow, and not have visibly starved while you were gone.
   */
  decayHours: number
  /**
   * The floor hunger decays to and never passes.
   *
   * This number is the difference between "needy" and "abandoned". It is not an
   * implementation detail: an unvisited creature must read as wanting company,
   * never as dying, so hunger asymptotes here instead of reaching zero.
   */
  floor: number
  /** How much one feeding restores. */
  feedGain: number
}

export interface Config {
  host: string
  port: number
  /** SQLite file. `:memory:` is accepted and used by the tests. */
  dbPath: string
  hunger: HungerConfig
  limits: RateLimits
  /** How many chain moves ride along in a `state` message. */
  chainLimit: number
  /** How far back the carer list reaches, in hours. */
  carerWindowHours: number
}

export const DEFAULTS = {
  host: '0.0.0.0',
  port: 8080,
  dbPath: './data/mochi.db',
  decayHours: 36,
  floor: 0.15,
  feedGain: 0.2,
  chainLimit: 40,
  carerWindowHours: 24,
  limits: { feed: 4, teach: 2, pet: 10, stamp: 2 } satisfies RateLimits
} as const

export function loadConfig(): Config {
  const floor = Math.min(0.95, Math.max(0, readFloat('MOCHI_HUNGER_FLOOR', DEFAULTS.floor)))

  return {
    host: readString('MOCHI_HOST', DEFAULTS.host),
    port: readInt('MOCHI_PORT', DEFAULTS.port),
    dbPath: readString('MOCHI_DB_PATH', DEFAULTS.dbPath),
    hunger: {
      decayHours: Math.max(0.01, readFloat('MOCHI_HUNGER_DECAY_HOURS', DEFAULTS.decayHours)),
      floor,
      feedGain: Math.max(0, readFloat('MOCHI_FEED_GAIN', DEFAULTS.feedGain))
    },
    limits: {
      feed: readInt('MOCHI_LIMIT_FEED', DEFAULTS.limits.feed),
      teach: readInt('MOCHI_LIMIT_TEACH', DEFAULTS.limits.teach),
      pet: readInt('MOCHI_LIMIT_PET', DEFAULTS.limits.pet),
      stamp: readInt('MOCHI_LIMIT_STAMP', DEFAULTS.limits.stamp)
    },
    chainLimit: Math.max(1, readInt('MOCHI_CHAIN_LIMIT', DEFAULTS.chainLimit)),
    carerWindowHours: Math.max(1, readInt('MOCHI_CARER_WINDOW_HOURS', DEFAULTS.carerWindowHours))
  }
}

/** Config for tests and for the local dev fixture: in-memory, generous limits. */
export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    host: '127.0.0.1',
    port: 0,
    dbPath: ':memory:',
    hunger: { decayHours: DEFAULTS.decayHours, floor: DEFAULTS.floor, feedGain: DEFAULTS.feedGain },
    limits: { ...DEFAULTS.limits },
    chainLimit: DEFAULTS.chainLimit,
    carerWindowHours: DEFAULTS.carerWindowHours,
    ...overrides
  }
}

export const RATE_LIMIT_WINDOW_MS = 60_000

export function limitFor(limits: RateLimits, kind: MutatingKind): number {
  return limits[kind]
}
