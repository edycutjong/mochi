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
 * corner where the thumb arc used to live — but the meadow has objects the
 * visitor must walk to. The bowl, stage, plaque and totem are all out of reach
 * from spawn, and removing locomotion would strand them. "Locomotion is
 * optional" in the design means the *core loop* survives standing still, not
 * that the scene is playable without moving at all.
 *
 * ## The open question this file could not answer, now answered
 *
 * The native HUD puts the joystick bottom-left and the interaction and emote
 * buttons bottom-right. The design's thumb arc wanted that same strip for FEED
 * and TEACH, and whether they collided was a question about a specific phone's
 * screen that no desktop preview or document could settle.
 *
 * A device answered it on 2026-08-23: they collided completely. The arc covered
 * the joystick and the emote buttons on both sides, and a tap aimed at jump
 * landed on TEACH — which writes a permanent row to an append-only chain.
 *
 * The fix taken was the one predicted here: not to move the buttons but to drop
 * them. The input guidance already routes the primary tap through `IA_POINTER`,
 * which *is* the native interaction button, so FEED became a tap on a bowl and
 * TEACH a tap on a stage. The thumb arc is gone, and with it the collision —
 * structurally, not by finding better percentages. Nothing this scene draws now
 * touches the bottom of the screen.
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
