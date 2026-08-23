/**
 * The one-parcel budget, as a gate rather than as a claim.
 *
 * `scripts/scene_budget.ts` builds the whole scene against a real engine and
 * counts it; this turns those counts into a check that fails the build if an
 * addition ever pushes the scene past what a single parcel is allowed. The
 * audit it prints is the artifact — this file is the ratchet under it.
 *
 * Importing the script runs the measurement and prints the table, which is
 * deliberate: the numbers in DEMO.md and the numbers this asserts on are the
 * same numbers, produced once.
 */

import { expect, test } from 'vitest'

import { BUDGET, SCENE_LIMITS, PARCELS } from '../scripts/scene_budget'

test(`the scene fits ${PARCELS} parcel at its most expensive`, () => {
  expect(BUDGET.entities).toBeLessThanOrEqual(SCENE_LIMITS.entities)
  expect(BUDGET.materials).toBeLessThanOrEqual(SCENE_LIMITS.materials)
  expect(BUDGET.textures).toBeLessThanOrEqual(SCENE_LIMITS.textures)
})

test('the published figures are the measured figures', () => {
  // README.md and DEMO.md both print these three numbers. Pinning them exactly
  // — rather than asserting a comfortable range — is what makes those documents
  // checkable: a change that alters the scene graph fails here and cannot ship
  // while the prose still claims the old count.
  expect(BUDGET.entities).toBe(32)
  expect(BUDGET.materials).toBe(14)
  expect(BUDGET.textures).toBe(0)
})

test('every verb in the scene is a tap on something in the world', () => {
  // Four props carry a PointerEvents: the creature's body (PET), the bowl
  // (FEED), the stage (TEACH) and the totem (STAMP). This is the ratchet under
  // the interaction redesign — FEED and TEACH were screen-space buttons that
  // sat on top of the mobile client's own joystick and jump control, and the
  // fix was to own none of that strip. A regression that put a verb back on the
  // screen would take one of these away.
  expect(BUDGET.pointerEvents).toBe(4)
})

test('the ring of dancers is the only elastic cost, and it is capped', () => {
  // The measurement hands the ring forty chain entries. Six is the capacity of
  // the top rung, so a world with a thousand moves in its chain costs exactly
  // as much as this one.
  expect(BUDGET.avatarShapes).toBe(6)
})

test('nothing in the scene loads a texture', () => {
  // Every surface is a flat or emissive colour. This is why the deployable
  // payload is what it is, and why the texture budget is untouched — it is a
  // property worth failing a build over rather than a note in a README.
  expect(BUDGET.textures).toBe(0)
})
