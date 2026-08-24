/**
 * A temporary frame-rate readout, for calibrating the fidelity watchdog.
 *
 * ## Why this exists
 *
 * The watchdog in `mochi/fidelity-watchdog.ts` decides when the clearing is
 * too expensive by watching frame time. Picking that threshold needs one fact
 * Decentraland does not publish: the client's Scene Limits panel reports
 * Performance as "a percentage of the FPS budget set by the active graphic
 * profile", and nowhere in the documentation is that budget given a number. So
 * a reading of 70% is either about 42 fps against a 60 fps budget or about 21
 * fps against a 30 fps one, and those two readings want thresholds on opposite
 * sides of 30 fps. Guessing produces a watchdog that either never fires or
 * degrades a device that was coping.
 *
 * This puts the scene's own measured frame rate on screen next to the client's
 * percentage, so the two can be read together once on a real phone and the
 * threshold set from the answer. It is the same move `docs/PROBE.md` records
 * for the emote question: stop reading, measure.
 *
 * ## Why it is a constant and not a setting
 *
 * It is scaffolding, and it must not reach a judge. `SHOW_FPS` is checked by
 * `scripts/check_submission_readiness.ts`, which fails while it is true — the
 * same gate that refuses to let an unresolved placeholder token ship. Delete
 * this file once the threshold is calibrated.
 */

/** Flip to true to calibrate on a phone. The readiness gate fails while it is. */
export const SHOW_FPS = false

/** Window over which frames are counted. Short enough to react, long to steady. */
const SAMPLE_SECONDS = 0.5

let elapsed = 0
let frames = 0
let fps = 0
let worst = 0

export function fpsReadoutSystem(dt: number) {
  if (!SHOW_FPS) return

  elapsed += dt
  frames++

  const frameMs = dt * 1000
  if (frameMs > worst) worst = frameMs

  if (elapsed < SAMPLE_SECONDS) return
  fps = Math.round(frames / elapsed)
  elapsed = 0
  frames = 0
}

/**
 * Live frame rate, and the worst single frame seen so far.
 *
 * The worst frame is the interesting half: a spike on tap is what a rebuild of
 * the ring costs, and it is what the watchdog's smoothing has to be able to
 * ignore without going deaf to a genuinely struggling device.
 */
export function fpsLine(): string {
  return `${fps} fps · worst frame ${Math.round(worst)}ms`
}

/** Clears the worst-frame high-water mark, so a spike can be provoked again. */
export function resetWorstFrame() {
  worst = 0
}
