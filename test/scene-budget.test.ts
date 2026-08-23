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
