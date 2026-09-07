/**
 * UI tokens the headless suite can reach.
 *
 * `vitest.config.ts` records that the react-ecs HUD cannot be imported into a
 * test, so the two things a test wants to assert about the HUD — how big the
 * type is and what colours it is set in — live here, SDK-free, and the .tsx
 * files spend them. Same arrangement as `picker-layout.ts`, for the same
 * reason: numbers that were only checkable on a device are now checkable in CI.
 *
 * Units are virtual pixels on the 1280x720 UI canvas (see `VIRTUAL` in
 * picker-layout.ts), which the renderer scales to the real screen.
 */

/**
 * Type scale per platform. The mobile guidance is to author on desktop and
 * multiply by roughly 3 for a phone held at arm's length; whether that
 * multiplier compounds with the renderer's own virtual-scale factor is not
 * documented, so these are the values that read on a Galaxy S24 Ultra.
 */
export const TYPE_SCALE = {
  mobile: { tile: 28, title: 32, bubble: 30 },
  desktop: { tile: 16, title: 19, bubble: 17 }
} as const

/**
 * Colours as plain hex so a test can compute contrast on them. The .tsx files
 * wrap these in Color4 with their alpha; the alpha is recorded here too so the
 * test knows what it is approximating when it treats a 95%-opaque white tile as
 * white.
 */
export const UI_HEX = {
  /** Body text and tile labels: the only dark value in the HUD. */
  ink: '#4A3B52',
  /** Tile face, 0xf2 = 95% opaque over the pink grid. */
  tileFace: '#FFFFFF',
  tileFaceAlpha: 0xf2 / 0xff,
  /** Status bubble background, 0xe0 = 88% opaque over the scene. */
  bubbleFace: '#FFFFFF',
  bubbleFaceAlpha: 0xe0 / 0xff,
  /** Picker title, white on the 55% scrim. */
  title: '#FFFFFF',
  /** The scrim under the picker: Color4.create(0.23, 0.17, 0.27, 0.55). */
  scrim: '#3B2B45',
  scrimAlpha: 0.55
} as const

/**
 * The smallest tap target we will ship, in virtual pixels.
 *
 * 44 points is the platform floor (Apple HIG, Material's 48dp is close). The
 * conversion to virtual pixels depends on how tall the phone is in points when
 * held landscape, because the 720-unit canvas is fitted to the screen's short
 * side. The shortest common case is 360 dp (small Android, landscape), which
 * makes one virtual pixel 0.5 dp and a 44 dp target 88 virtual pixels. Every
 * bigger phone makes the same target larger, never smaller, so 88 is the
 * conservative bound and the one asserted.
 */
export const MIN_TOUCH_TARGET_VIRTUAL = 88

/**
 * The smallest type we will ship, in virtual pixels: 12 dp at the same worst
 * case conversion. Below this a label on a 360 dp-tall phone is under 12 dp.
 */
export const MIN_TYPE_VIRTUAL = 24
