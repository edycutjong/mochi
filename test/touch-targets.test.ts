/**
 * Can a thumb hit it, and can an eye read it?
 *
 * The picker's geometry test guards against the layout colliding with the
 * client's controls. This one guards against the other way a mobile HUD fails
 * quietly: targets that fit the design but not a fingertip, and type that fit
 * the desktop but not a phone at arm's length. Both were previously checked by
 * holding a Galaxy S24 Ultra and looking; that is still the final check, but
 * the numbers this test pins are the ones that would have to change for it to
 * fail again.
 *
 * Every threshold is derived in `src/ui/tokens.ts` from the worst-case phone
 * (360 dp tall in landscape), so a pass here holds on every larger screen.
 *
 * What this cannot cover: the three 3D verbs (FEED, PET, TEACH) are pointer
 * events on world-space colliders whose on-screen size depends on where the
 * visitor stands. Those remain a device check.
 */

import { expect, test } from 'vitest'

import { panelInset, tileSize } from '../src/ui/picker-layout'
import { MIN_TOUCH_TARGET_VIRTUAL, MIN_TYPE_VIRTUAL, TYPE_SCALE, UI_HEX } from '../src/ui/tokens'

// --- tap targets -------------------------------------------------------------

test('every picker tile on mobile is at least a 44 dp tap target on both axes', () => {
  const tile = tileSize(panelInset(true))
  expect(tile.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_VIRTUAL)
  expect(tile.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_VIRTUAL)
})

test('desktop tiles clear the same floor, so a touch laptop is not a special case', () => {
  const tile = tileSize(panelInset(false))
  expect(tile.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_VIRTUAL)
  expect(tile.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_VIRTUAL)
})

// --- type --------------------------------------------------------------------

test('no mobile label renders under 12 dp on the smallest landscape phone', () => {
  for (const [name, size] of Object.entries(TYPE_SCALE.mobile)) {
    expect(size, `TYPE_SCALE.mobile.${name}`).toBeGreaterThanOrEqual(MIN_TYPE_VIRTUAL)
  }
})

test('the mobile scale is larger than the desktop scale for every role', () => {
  // The whole point of two scales. If someone tunes desktop up past mobile the
  // phone gets the smaller type and nobody notices until a device check.
  for (const role of Object.keys(TYPE_SCALE.mobile) as Array<keyof typeof TYPE_SCALE.mobile>) {
    expect(TYPE_SCALE.mobile[role]).toBeGreaterThan(TYPE_SCALE.desktop[role])
  }
})

// --- contrast ----------------------------------------------------------------

/** WCAG 2.x relative luminance of a #RRGGBB colour. */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2)
}

/** WCAG contrast ratio, 1:1 to 21:1. */
function contrast(fg: string, bg: string): number {
  const [a, b] = [luminance(fg), luminance(bg)]
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** Composite a colour with alpha over an opaque backdrop, per channel. */
function over(hex: string, alpha: number, backdrop: string): string {
  const mix = (i: number) => {
    const f = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
    const b = parseInt(backdrop.slice(1 + i * 2, 3 + i * 2), 16)
    return Math.round(f * alpha + b * (1 - alpha))
  }
  return '#' + [0, 1, 2].map((i) => mix(i).toString(16).padStart(2, '0')).join('').toUpperCase()
}

// The pink grid the tiles sit on: PALETTE.bodyLight in src/config.ts.
const PICKER_GRID = '#FFD9E8'

test('tile labels meet WCAG AA (4.5:1) on the tile face, alpha included', () => {
  const face = over(UI_HEX.tileFace, UI_HEX.tileFaceAlpha, PICKER_GRID)
  expect(contrast(UI_HEX.ink, face)).toBeGreaterThanOrEqual(4.5)
})

test('the status bubble meets WCAG AA over the lightest thing it can sit on', () => {
  // Worst case is the bubble over a white sky; anything darker behind an 88%
  // white bubble only raises the contrast of dark ink on it.
  const face = over(UI_HEX.bubbleFace, UI_HEX.bubbleFaceAlpha, '#FFFFFF')
  expect(contrast(UI_HEX.ink, face)).toBeGreaterThanOrEqual(4.5)
})

test('the picker title meets WCAG AA for large text (3:1) on the scrim over the brightest scene colour', () => {
  // The title is 32 virtual px on mobile — large text by the WCAG definition,
  // whose floor is 3:1. Worst case is the 55% scrim over a white sky.
  const scrim = over(UI_HEX.scrim, UI_HEX.scrimAlpha, '#FFFFFF')
  expect(contrast(UI_HEX.title, scrim)).toBeGreaterThanOrEqual(3)
})
