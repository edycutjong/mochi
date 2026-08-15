/**
 * Day-1 capability probe — the auto-detected readings.
 *
 * Platform, canvas size and player identity are all things the explorer will
 * simply tell us. Reading them confirms the probe is genuinely running on a
 * phone, which is the precondition for every other answer being meaningful:
 * a green board collected from the desktop preview proves nothing.
 */

import { engine, UiCanvasInformation, PlayerIdentityData, AvatarBase } from '@dcl/sdk/ecs'
import { getPlatform } from '@dcl/sdk/platform'
import { probe } from './state'

let elapsed = 0
let frames = 0

export function telemetrySystem(dt: number) {
  // Rolling FPS, recomputed about once a second.
  elapsed += dt
  frames++
  if (elapsed >= 1) {
    probe.fps = Math.round(frames / elapsed)
    elapsed = 0
    frames = 0
  }

  probe.platform = getPlatform() ?? 'unknown'

  const canvas = UiCanvasInformation.getOrNull(engine.RootEntity)
  if (canvas) {
    probe.screen = `${canvas.width}x${canvas.height} @${canvas.devicePixelRatio.toFixed(1)}x`
  }

  // Identity comes from two components: the wallet address from
  // PlayerIdentityData, the display name from AvatarBase. Both are needed for
  // the credited dance chain, so both are checked here.
  const identity = PlayerIdentityData.getOrNull(engine.PlayerEntity)
  if (identity) {
    probe.playerIsGuest = identity.isGuest
    probe.playerAddress = identity.address
  }

  const base = AvatarBase.getOrNull(engine.PlayerEntity)
  if (base?.name) probe.playerName = base.name
}
