/**
 * Design tokens and tunables.
 *
 * Colours are the scene's palette, kept in one place so the creature, the
 * meadow and the HUD cannot drift apart. Motion timings live here too — the
 * aliveness language is the thing being judged by eye, so the numbers need to
 * be adjustable in one file while iterating on a phone.
 */

import { Color4 } from '@dcl/sdk/math'

export const PALETTE = {
  /** Mochi's body, top-to-bottom gradient endpoints. */
  bodyLight: Color4.fromHexString('#FFD9E8ff'),
  bodyDeep: Color4.fromHexString('#FFC2DCff'),
  /** Eyes and outlines — the only dark value in the scene. */
  ink: Color4.fromHexString('#7A5165ff'),
  /** Ground and mid-distance meadow. */
  meadowNear: Color4.fromHexString('#A8E6CFff'),
  meadowFar: Color4.fromHexString('#C9F0DCff'),
  /** Accent — hunger, the credited state, the fed berry. */
  accent: Color4.fromHexString('#FF8FB1ff'),
  /** Day sky. Night is a state, not the theme. */
  sky: Color4.fromHexString('#FFF4E6ff')
}

/** Where the creature stands. The spawn point in scene.json faces this. */
export const MOCHI_HOME = { x: 8, y: 0, z: 8 }

/**
 * The authoritative server.
 *
 * A scene has no environment variables — it is downloaded and run by the
 * client, so this is baked in at deploy time and there is nowhere else to put
 * it. It must be `wss://` in production: the mobile client will refuse a
 * plaintext socket from a secure page, and the failure looks like the server
 * being down rather than like a protocol mistake.
 *
 * `ws://127.0.0.1:8080` is the local default so `npm run start:mobile` works
 * against a server running on the same machine.
 */
export const SERVER_URL = 'ws://127.0.0.1:8080'

/**
 * Motion timings, in seconds unless noted.
 *
 * Every one of these is a number to be argued with on a real phone at day 4-5.
 * They are collected here rather than inlined so that argument is cheap.
 */
export const MOTION = {
  /** Idle breathing: a slow, barely-there swell. */
  breatheScale: 1.04,
  breatheMs: 2400,

  /** Waddle-greet when someone approaches. */
  greetRadius: 6,
  greetStepMs: 420,
  greetSquash: 0.9,

  /** Eat: anticipation squash, big stretch, settle. */
  eatSquashMs: 140,
  eatStretchMs: 220,
  eatSettleMs: 380,

  /** PET is a latch-on-press hold — no drag deltas exist on mobile. */
  petHoldMs: 900
}

/**
 * The creature's resting size, and how much one feeding adds.
 *
 * Size is the literal sum of every feeding, so this is the unit of that sum.
 * Kept small: the growth has to be legible across many visits without the
 * creature outgrowing the meadow.
 */
export const GROWTH = {
  baseScale: 1.0,
  perFeed: 0.012,
  maxScale: 1.9
}
