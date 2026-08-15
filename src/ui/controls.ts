/**
 * Mobile on-screen control configuration.
 *
 * `TouchScreenControls` lets a scene reshape the client's native touch HUD —
 * hide the joystick or crosshair, repoint the large central button, or replace
 * button glyphs with custom textures. It is not in the documentation; the
 * component and its fields are only discoverable in `@dcl/ecs`.
 *
 * ## What is changed, and what deliberately is not
 *
 * **Crosshair: hidden.** Nothing here is aimed. The scene's targets are a
 * creature the size of a car and three waist-high props, so a reticle adds
 * clutter to a small screen and suggests a precision the design does not want.
 *
 * **Joystick: kept.** Hiding it was tempting — it would clear the bottom-left
 * corner where the thumb arc wants to live — but the meadow has objects the
 * visitor must walk to. The bush, plaque and totem are all out of reach from
 * spawn, and removing locomotion would strand them. "Locomotion is optional"
 * in the design means the *core loop* survives standing still, not that the
 * scene is playable without moving at all.
 *
 * ## The open question this file cannot answer
 *
 * The native HUD puts the joystick bottom-left and the interaction button
 * bottom-right. The design's thumb arc wants that same strip for FEED and
 * TEACH. Whether they collide, and by how much, is a question about a specific
 * phone's screen — it cannot be settled from a desktop preview or from the
 * docs. It is listed as a check in `docs/PROBE.md`.
 *
 * If they do collide, the cheapest fix is not to move our buttons but to drop
 * them: the input guidance already routes the primary tap through
 * `IA_POINTER`, which *is* the native interaction button. FEED and TEACH could
 * become world-space taps on the bush and the creature, and the thumb arc
 * would disappear entirely.
 */

import { engine, TouchScreenControls } from '@dcl/sdk/ecs'
import { isMobile } from '@dcl/sdk/platform'

export function setupTouchControls() {
  if (!isMobile()) return

  TouchScreenControls.createOrReplace(engine.RootEntity, {
    touchInputs: [],
    hideJoystick: false,
    hideCrosshair: true
  })
}
