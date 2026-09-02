/**
 * The picker must not fight the client for the screen.
 *
 * On 2026-09-02 a recording of the deployed World on a Galaxy S24 Ultra showed
 * the TEACH picker rendering underneath the Decentraland client's own F, E,
 * jump and + buttons — they sat on its right-hand column, over `dab` and `tik`,
 * so a tap meant for a move landed on jump. Its bottom row was clipped by the
 * panel edge at the same time.
 *
 * Both were geometry, and geometry is checkable without a renderer. That is the
 * whole reason `src/ui/picker-layout.ts` exists as a separate, SDK-free module:
 * `vitest.config.ts` records that the react-ecs HUD cannot be imported into a
 * test at all, so the numbers had to move somewhere a test can reach them.
 *
 * Nothing here asserts anything is *drawn* correctly — that is still a device
 * check. It asserts the layout cannot silently return to a shape that was
 * already observed to be wrong.
 */

import { expect, test } from 'vitest'

import {
  CLIENT_CONTROL_ZONES,
  GRID,
  gridFits,
  overlaps,
  panelInset,
  panelRect
} from '../src/ui/picker-layout'

const MOBILE = panelInset(true)
const DESKTOP = panelInset(false)

test('on mobile the panel clears every one of the client\'s own controls', () => {
  const panel = panelRect(MOBILE)

  // Named individually rather than looped, so a failure says which control the
  // picker crawled back under.
  expect(overlaps(panel, CLIENT_CONTROL_ZONES.topLeftCluster)).toBe(false)
  expect(overlaps(panel, CLIENT_CONTROL_ZONES.bottomLeftEmote)).toBe(false)
  expect(overlaps(panel, CLIENT_CONTROL_ZONES.bottomRightCluster)).toBe(false)
})

test('the panel stays inside the viewport', () => {
  for (const inset of [MOBILE, DESKTOP]) {
    const panel = panelRect(inset)
    expect(panel.left).toBeGreaterThanOrEqual(0)
    expect(panel.top).toBeGreaterThanOrEqual(0)
    expect(panel.right).toBeLessThanOrEqual(1)
    expect(panel.bottom).toBeLessThanOrEqual(1)
    expect(panel.right).toBeGreaterThan(panel.left)
    expect(panel.bottom).toBeGreaterThan(panel.top)
  }
})

test('all twelve moves fit — no row is clipped, on either platform', () => {
  // The regression this pins: percentage margins resolve against the
  // container's WIDTH on both axes, so a vertical margin on a 2.17:1 viewport
  // is far larger than it looks. Four rows of 20%-tall tiles overflowed a
  // 62%-tall grid and the bottom row was cut off. `gridFits` reproduces that
  // rule rather than assuming the sane one.
  expect(GRID.columns * GRID.rows).toBe(12)

  for (const inset of [MOBILE, DESKTOP]) {
    const fit = gridFits(inset)
    expect(fit.horizontal).toBe(true)
    expect(fit.vertical).toBe(true)
  }
})

test('the grid is wider than it is tall, because the panel is', () => {
  // 12 tiles in a short, wide box are 4x3. This is the assertion that would
  // have failed on the old 3x4 layout before anyone had to watch a recording
  // to notice the bottom row was missing.
  expect(GRID.columns).toBeGreaterThan(GRID.rows)
})

test('the title and the grid together do not exceed the panel', () => {
  expect(GRID.titleHeight + GRID.gridHeight).toBeLessThanOrEqual(1)
})
