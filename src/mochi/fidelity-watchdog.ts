/**
 * The thing that actually pulls the ladder.
 *
 * `dancers.ts` has always been able to draw the ring at three rungs, and
 * README and ARCHITECTURE have always told judges that "a slow device gets a
 * plainer clearing rather than a broken one". That sentence was not true:
 * `setFidelity` was exported, tested, and never called from anywhere in `src`.
 * Every device — a flagship and a three-year-old mid-range phone alike — got
 * six `AvatarShape` entities, the single most expensive instantiation the
 * mobile client performs.
 *
 * It showed up the moment the scene was measured on a real phone: roughly 90%
 * on the Scene Limits panel with an empty clearing, falling to 70% once the
 * ghosts accumulated. The ladder was the designed answer to exactly that, and
 * nothing was reaching for it.
 *
 * ## Why smoothed, and why sustained
 *
 * Interacting with the creature costs a visible frame: teaching a move changes
 * the chain, which rebuilds the ring. That spike is real, it is bounded, and it
 * is not a reason to permanently degrade the scene for someone whose phone is
 * otherwise coping. So this watches an exponential moving average and requires
 * it to stay over budget for SUSTAIN_SECONDS before it acts. A single expensive
 * frame moves the average by EMA_ALPHA and is forgotten.
 *
 * ## Why it only ever goes down
 *
 * Climbing back up is tempting and wrong. Each rung change destroys and rebuilds
 * every dancer, so a scene hovering at the threshold would thrash between rungs,
 * paying the rebuild repeatedly and looking broken while it did — the cost the
 * ladder exists to avoid, inflicted by the ladder itself. A visitor who drops to
 * three avatars keeps three avatars for the visit. The chain, the credit and the
 * order survive at every rung, so nothing is lost but fidelity.
 */

import { getFidelity, setFidelity, type Fidelity } from './dancers'

/**
 * Ignore the opening seconds. Scene load, wearable fetches and avatar
 * instantiation all land here, and none of them describe the steady state.
 */
const WARMUP_SECONDS = 8

/** 30 fps. Below this the clearing reads as stuttering rather than merely busy. */
const DEGRADE_FRAME_MS = 1000 / 30

/** How long the average must stay over budget before a rung is dropped. */
const SUSTAIN_SECONDS = 5

/** Quiet period after a rung change, since the rebuild itself costs frames. */
const SETTLE_SECONDS = 4

/** EMA smoothing. Low enough that one bad frame cannot trip the watchdog. */
const EMA_ALPHA = 0.1

const NEXT_RUNG: Record<Fidelity, Fidelity | null> = {
  'avatars-6': 'avatars-3',
  'avatars-3': 'nametags',
  nametags: null
}

let elapsed = 0
let settle = 0
let overBudget = 0
let smoothedMs = 0

/** Test seam. The scene never resets; a test file runs many scenarios. */
export function resetFidelityWatchdog() {
  elapsed = 0
  settle = 0
  overBudget = 0
  smoothedMs = 0
}

/** The smoothed frame time in milliseconds, exposed for tests and telemetry. */
export function smoothedFrameMs(): number {
  return smoothedMs
}

export function fidelityWatchdogSystem(dt: number) {
  const frameMs = dt * 1000
  // First sample seeds the average outright; blending it against zero would
  // spend the whole warm-up climbing out of a number no frame ever took.
  smoothedMs = smoothedMs === 0 ? frameMs : smoothedMs + EMA_ALPHA * (frameMs - smoothedMs)

  elapsed += dt
  if (elapsed < WARMUP_SECONDS) return

  if (settle > 0) {
    settle -= dt
    return
  }

  const next = NEXT_RUNG[getFidelity()]
  if (next === null) return

  if (smoothedMs <= DEGRADE_FRAME_MS) {
    overBudget = 0
    return
  }

  overBudget += dt
  if (overBudget < SUSTAIN_SECONDS) return

  setFidelity(next)
  overBudget = 0
  settle = SETTLE_SECONDS
  // Re-seed rather than carry the old average across the rebuild: the whole
  // point is to find out whether the cheaper ring fixed anything.
  smoothedMs = 0
}
