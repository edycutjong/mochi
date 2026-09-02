/**
 * Where the TEACH picker is allowed to be drawn.
 *
 * Pure geometry, deliberately free of any `@dcl/sdk` runtime import, so the
 * headless suite can check it. `vitest.config.ts` explains why that matters:
 * the react-ecs HUD reaches for the client runtime and cannot be imported into
 * a test at all, so anything about the picker that should be verifiable has to
 * live outside the .tsx file. This is that part.
 *
 * ## The problem this encodes
 *
 * The picker is the only screen-space UI the scene owns, and on 2026-09-02 a
 * recording of the deployed World on a Galaxy S24 Ultra (2340x1080) showed it
 * losing a fight with the client's own controls: the F, E, jump and + buttons
 * rendered on top of its right-hand column, over `dab` and `tik`. A tap meant
 * for a move landed on jump.
 *
 * That is the same collision that deleted the FEED/TEACH thumb arc — see
 * `hud.tsx`. The arc was fixed by owning none of the bottom strip. A grid of
 * twelve choices cannot take that fix, so the picker is fixed the other way:
 * measure where the controls actually are, and stay out of those rectangles.
 *
 * Decentraland warns that scene UI "will clash with the system controls" but
 * does not publish where they sit. Everything below is measured off a frame,
 * not read off a spec, which is exactly why it is asserted rather than trusted.
 */

/** A rectangle in viewport fractions. `right`/`bottom` are edges, not insets. */
export type Rect = { left: number; right: number; top: number; bottom: number }

/** An inset from each edge, in viewport fractions. */
export type Inset = { left: number; right: number; top: number; bottom: number }

/**
 * The renderer's virtual canvas.
 *
 * `hud.tsx` hands these to `setUiRenderer`, and the fit arithmetic below needs
 * the same numbers, so they are defined once here rather than typed twice.
 * 1280x720 is the desktop reference size Decentraland's mobile guidance tells
 * you to author against before scaling up.
 */
export const VIRTUAL = { width: 1280, height: 720 }

/**
 * Where the Decentraland mobile client draws its own controls.
 *
 * Viewport fractions, measured from a 1080x496 frame of the deployed World.
 * Deliberately generous: a tap target is larger than the glyph inside it, and
 * being a few percent too cautious costs nothing while being a few percent too
 * tight costs a judge a mis-tap.
 */
// `satisfies` rather than a `Record<string, Rect>` annotation: the annotation
// widens the keys to `string`, and under `noUncheckedIndexedAccess` every
// lookup then comes back `Rect | undefined`. Keeping the literal keys means a
// test can name a zone directly and still get a `Rect`.
export const CLIENT_CONTROL_ZONES = {
  /** Avatar portrait, chat bubble and compass, along the top-left. */
  topLeftCluster: { left: 0, right: 0.24, top: 0, bottom: 0.17 },
  /** The emote / sit control sitting above the movement joystick. */
  bottomLeftEmote: { left: 0, right: 0.14, top: 0.83, bottom: 1 },
  /** F, E, zoom and jump, stacked into the bottom-right corner. */
  bottomRightCluster: { left: 0.77, right: 1, top: 0.6, bottom: 1 }
} satisfies Record<string, Rect>

/**
 * The box the picker panel occupies.
 *
 * On mobile it sits well left of the F/E/jump stack and stops above the emote
 * control. On desktop there are no touch controls to dodge, so it stays
 * centred and roomy — the guidance to put actionable dialogs centre-screen was
 * never wrong, it just cannot be followed literally on a phone.
 */
export function panelInset(mobile: boolean): Inset {
  return mobile
    ? { left: 0.03, right: 0.26, top: 0.18, bottom: 0.18 }
    : { left: 0.07, right: 0.07, top: 0.13, bottom: 0.13 }
}

/**
 * Grid geometry, as fractions of the panel.
 *
 * Twelve tiles in a wide, short box are 4x3, not 3x4. The old layout was 3x4
 * and its bottom row was clipped, for a reason worth writing down: percentage
 * margins resolve against the container's WIDTH in both axes. On a 2.17:1
 * viewport a 1.5% vertical margin is enormous relative to the height available,
 * so four rows of 20%-tall tiles overflowed a 62%-tall grid and the last row
 * was cut off at the panel edge.
 *
 * `rowsFit` below reproduces that arithmetic — multiplying the margin by the
 * panel WIDTH even when checking the vertical axis — so the bug cannot come
 * back silently.
 */
export const GRID = {
  columns: 4,
  rows: 3,
  titleHeight: 0.14,
  gridHeight: 0.86,
  tileWidth: 0.22,
  tileHeight: 0.28,
  tileMargin: 0.01
}

/** The panel's box on the viewport, in fractions, given its inset. */
export function panelRect(inset: Inset): Rect {
  return {
    left: inset.left,
    right: 1 - inset.right,
    top: inset.top,
    bottom: 1 - inset.bottom
  }
}

/** Do two rectangles share any area at all? Touching edges do not count. */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

/** The panel's size in virtual units. */
export function panelSize(inset: Inset): { width: number; height: number } {
  return {
    width: (1 - inset.left - inset.right) * VIRTUAL.width,
    height: (1 - inset.top - inset.bottom) * VIRTUAL.height
  }
}

/**
 * Does the grid's content fit inside the grid container, on both axes?
 *
 * The margin is multiplied by the panel width in BOTH calculations. That is not
 * a bug in this function — it is the layout rule the clipped bottom row was
 * caused by, reproduced faithfully so the check is honest.
 */
export function gridFits(inset: Inset): { horizontal: boolean; vertical: boolean } {
  const panel = panelSize(inset)
  const margin = GRID.tileMargin * panel.width

  const columnWidth = GRID.tileWidth * panel.width + margin * 2
  const gridHeight = GRID.gridHeight * panel.height
  const rowHeight = GRID.tileHeight * gridHeight + margin * 2

  return {
    horizontal: columnWidth * GRID.columns <= panel.width,
    vertical: rowHeight * GRID.rows <= gridHeight
  }
}
