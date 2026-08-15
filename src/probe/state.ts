/**
 * Day-1 capability probe — shared result state.
 *
 * The probe exists to answer five yes/no questions about what SDK7 actually does
 * on the Decentraland MOBILE client, on a real phone. Everything here is read by
 * the on-screen HUD so the answers are legible on the device itself, with no
 * console attached.
 *
 * Check 2 (emote detection) is the one that decides the shape of the project:
 * if the explorer does not report emotes to the scene on mobile, the TEACH
 * mechanic cannot exist in its intended form.
 */

export type CheckStatus = 'pending' | 'auto-pass' | 'auto-fail' | 'look'

export type ProbeState = {
  /** Explorer-reported platform, via getPlatform(). */
  platform: string
  /** Canvas size and pixel ratio — confirms we are really on a phone. */
  screen: string
  /** Local player, from the players helper. */
  playerName: string
  playerIsGuest: boolean | null
  playerAddress: string

  /**
   * Check 2 — emote detection. Auto-detected.
   *
   * Two independent detection paths are instrumented, because they can fail
   * separately and the difference changes what we build:
   *  - `pollCount`   — the grow-only value set actually grew (data arrived).
   *  - `onChangeCount` — the onChange callback fired (the idiomatic path).
   * Data arriving but onChange never firing is a very different problem from
   * no emote data at all.
   */
  pollCount: number
  onChangeCount: number
  lastEmoteUrn: string
  lastEmoteState: string
  lastEmoteFromSelf: boolean | null

  /** Frame budget sanity, so we notice a pathological scene early. */
  fps: number
}

export const probe: ProbeState = {
  platform: 'reading…',
  screen: 'reading…',
  playerName: 'reading…',
  playerIsGuest: null,
  playerAddress: '',

  pollCount: 0,
  onChangeCount: 0,
  lastEmoteUrn: '—',
  lastEmoteState: '—',
  lastEmoteFromSelf: null,

  fps: 0
}

/** Strips the long URN prefix so an emote reads on a phone screen. */
export function shortUrn(urn: string): string {
  if (!urn || urn === '—') return '—'
  const tail = urn.split(':').pop() ?? urn
  return tail.length > 24 ? `${tail.slice(0, 24)}…` : tail
}
