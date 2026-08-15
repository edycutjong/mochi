/**
 * Hunger decay.
 *
 * Hunger is a single number in 0..1 that the server derives, never the client.
 * It is stored alongside the timestamp it was last written at, and the current
 * value is recomputed from those two on every read. That makes decay a pure
 * function of `(stored value, stored timestamp, now)` — which is exactly why a
 * process restart changes nothing: no timer has to survive, and there is no
 * accumulated drift to lose.
 *
 * The one rule that matters: **decay stops at a floor.** An unvisited creature
 * has to read as needy so someone comes back for it. It must never read as
 * dying or abandoned, so there is no path from any input to a hunger of zero.
 */

import type { HungerConfig } from './config.js'

const MS_PER_HOUR = 3_600_000

/**
 * Hunger lost per millisecond.
 *
 * Calibrated so a full belly (1.0) reaches the floor in exactly `decayHours`,
 * whatever the floor is set to. Changing the floor changes where decay stops,
 * not how long the slide takes.
 */
export function decayRatePerMs(config: HungerConfig): number {
  return (1 - config.floor) / (config.decayHours * MS_PER_HOUR)
}

/**
 * Hunger at `now`, given the value stored at `since`.
 *
 * Clamped into `[floor, 1]` at both ends: a stored value above 1 or below the
 * floor is corrected rather than trusted, and time running backwards (a clock
 * correction on the host) cannot inflate hunger.
 */
export function hungerAt(stored: number, since: number, now: number, config: HungerConfig): number {
  const elapsed = Math.max(0, now - since)
  const start = clamp(stored, config.floor, 1)
  const decayed = start - elapsed * decayRatePerMs(config)
  return clamp(decayed, config.floor, 1)
}

/**
 * Hunger after one feeding, applied on top of whatever has decayed away.
 *
 * Feeding a full creature is not an error; it just tops out at 1. The feeding
 * still counts towards the size and still credits the carer, because the point
 * of the act is the act.
 */
export function hungerAfterFeed(current: number, config: HungerConfig): number {
  return clamp(current + config.feedGain, config.floor, 1)
}

/** Milliseconds from a full belly to the floor. Reported by the health check. */
export function fullToFloorMs(config: HungerConfig): number {
  return config.decayHours * MS_PER_HOUR
}

function clamp(value: number, low: number, high: number): number {
  if (!Number.isFinite(value)) return low
  return Math.min(high, Math.max(low, value))
}
