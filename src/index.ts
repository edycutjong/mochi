import { engine } from '@dcl/sdk/ecs'

import { setupProbeWorld, avatarEmoteLoopSystem } from './probe/world'
import { emoteProbeSystem } from './probe/emote-probe'
import { telemetrySystem } from './probe/telemetry'
import { setupProbeHud } from './probe/hud'

/**
 * Mochi — day-1 capability probe.
 *
 * Not the scene. This build answers five questions about what SDK7 actually
 * does on the Decentraland mobile client, on a real phone, before any of them
 * can cost a week of build time. See docs/PROBE.md for how to run it and what
 * each answer changes.
 */
export function main() {
  setupProbeWorld()

  engine.addSystem(telemetrySystem)
  engine.addSystem(emoteProbeSystem)
  engine.addSystem(avatarEmoteLoopSystem)

  setupProbeHud()
}
