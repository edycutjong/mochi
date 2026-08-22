/**
 * Exhaustive verification of the one property that must never be wrong.
 *
 * Hunger is the only continuously-changing number in the system, and it is the
 * one a visitor reads emotionally rather than numerically. If it can reach zero
 * — through a clock correction, a corrupted stored value, an absurd elapsed
 * time, or a configuration nobody anticipated — the creature stops reading as
 * *needy* and starts reading as *dying*, and the whole premise of coming back
 * to something that wants company inverts into guilt.
 *
 * Example-based tests cover the cases somebody thought of. This one sweeps the
 * entire cross product of stored values, elapsed times and configurations,
 * including hostile inputs the code should never receive: NaN, Infinity,
 * negatives, values above 1, and time running backwards.
 *
 * The case count is printed by the test and quoted in the README. That number,
 * not the test, is the artifact.
 */

import { test, describe } from 'vitest'
import assert from 'node:assert/strict'

import { hungerAt, hungerAfterFeed } from '../src/hunger.js'

const HOUR = 3_600_000

/**
 * Stored hunger values, including states the database should never hold.
 *
 * A row can be corrupted, hand-edited during an incident, or written by an
 * older version of the schema. The function must correct rather than trust it.
 */
const STORED = [
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  -1e9,
  -1,
  -0.0001,
  0,
  0.0001,
  0.05,
  0.1,
  0.15,
  0.2,
  0.25,
  0.33,
  0.5,
  0.66,
  0.75,
  0.9,
  0.99,
  1,
  1.0001,
  2,
  1e9
]

/**
 * Elapsed milliseconds, including negatives.
 *
 * Negative elapsed time is not hypothetical: NTP corrects host clocks
 * backwards, and a server that had been running for a while would then compute
 * a negative interval. It must not inflate hunger.
 */
const ELAPSED = [
  -1e12,
  -HOUR,
  -1,
  0,
  1,
  1000,
  HOUR / 60,
  HOUR,
  6 * HOUR,
  12 * HOUR,
  18 * HOUR,
  24 * HOUR,
  30 * HOUR,
  35 * HOUR,
  36 * HOUR,
  37 * HOUR,
  48 * HOUR,
  72 * HOUR,
  7 * 24 * HOUR,
  30 * 24 * HOUR,
  365 * 24 * HOUR,
  1e15
]

/** Floors from "barely needy" to "almost full", plus the degenerate ends. */
const FLOORS = [0, 0.01, 0.05, 0.1, 0.15, 0.2, 0.35, 0.5, 0.9, 1]

/** Decay windows from impatient to glacial. */
const DECAY_HOURS = [0.5, 1, 6, 12, 24, 36, 72, 168]

/** Feed gains, including one that would overshoot a full belly many times over. */
const FEED_GAINS = [0.01, 0.2, 0.5, 1, 5]

describe('hunger — exhaustive invariants', () => {
  test('no input in the whole grid ever produces hunger outside [floor, 1]', () => {
    let cases = 0

    for (const floor of FLOORS) {
      for (const decayHours of DECAY_HOURS) {
        const config = { decayHours, floor, feedGain: 0.2 }

        for (const stored of STORED) {
          for (const elapsed of ELAPSED) {
            const value = hungerAt(stored, 0, elapsed, config)
            cases++

            assert.ok(
              Number.isFinite(value),
              `non-finite hunger from stored=${stored} elapsed=${elapsed} floor=${floor} decayHours=${decayHours}`
            )
            assert.ok(
              value >= floor,
              `hunger ${value} fell below floor ${floor} (stored=${stored} elapsed=${elapsed} decayHours=${decayHours})`
            )
            assert.ok(
              value <= 1,
              `hunger ${value} exceeded 1 (stored=${stored} elapsed=${elapsed} floor=${floor} decayHours=${decayHours})`
            )
          }
        }
      }
    }

    console.log(`      ${cases.toLocaleString('en-US')} decay combinations verified`)
    assert.ok(cases > 20_000, 'grid should be large enough to be worth calling exhaustive')
  })

  test('a creature with a floor above zero can never reach zero, from any input', () => {
    let cases = 0

    // The emotional invariant, stated separately from the numeric one because
    // it is the one a person actually experiences.
    for (const floor of FLOORS.filter((f) => f > 0)) {
      for (const decayHours of DECAY_HOURS) {
        const config = { decayHours, floor, feedGain: 0.2 }
        for (const stored of STORED) {
          for (const elapsed of ELAPSED) {
            cases++
            assert.notEqual(
              hungerAt(stored, 0, elapsed, config),
              0,
              `reached zero from stored=${stored} elapsed=${elapsed} floor=${floor}`
            )
          }
        }
      }
    }

    console.log(`      ${cases.toLocaleString('en-US')} starvation combinations refuted`)
  })

  test('feeding never overshoots, undershoots, or produces a non-finite belly', () => {
    let cases = 0

    for (const floor of FLOORS) {
      for (const feedGain of FEED_GAINS) {
        const config = { decayHours: 36, floor, feedGain }

        for (const stored of STORED) {
          const value = hungerAfterFeed(stored, config)
          cases++

          assert.ok(Number.isFinite(value), `non-finite belly from stored=${stored} feedGain=${feedGain}`)
          assert.ok(value >= floor, `belly ${value} below floor ${floor}`)
          assert.ok(value <= 1, `belly ${value} above 1 (stored=${stored} feedGain=${feedGain})`)
        }
      }
    }

    console.log(`      ${cases.toLocaleString('en-US')} feeding combinations verified`)
  })

  test('feeding is never punished — it always leaves hunger at least where it was', () => {
    let cases = 0

    // There is no fail state anywhere in this design, and that includes the
    // arithmetic: feeding an already-full creature must not reduce its belly.
    for (const floor of FLOORS) {
      for (const feedGain of FEED_GAINS) {
        const config = { decayHours: 36, floor, feedGain }
        for (const stored of STORED.filter((s) => Number.isFinite(s) && s >= floor && s <= 1)) {
          cases++
          assert.ok(
            hungerAfterFeed(stored, config) >= stored,
            `feeding lowered hunger from ${stored} (floor=${floor} feedGain=${feedGain})`
          )
        }
      }
    }

    console.log(`      ${cases.toLocaleString('en-US')} no-punishment combinations verified`)
  })
})
