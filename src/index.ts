import { engine, inputSystem, InputAction, PointerEventType } from '@dcl/sdk/ecs'

import { createMochi, applyGrowth, Mochi } from './mochi/creature'
import { createMeadow } from './mochi/meadow'
import { setupAliveness, alivenessSystem, playEat, playPetDown, playPetUp } from './mochi/aliveness'
import { setupHud, hudSystem, say } from './ui/hud'
import { setupTouchControls } from './ui/controls'

import { setupProbeWorld, avatarEmoteLoopSystem } from './probe/world'
import { emoteProbeSystem } from './probe/emote-probe'
import { telemetrySystem } from './probe/telemetry'
import { setupProbeHud } from './probe/hud'

/**
 * Which build to run.
 *
 * `'scene'` — Mochi, the meadow and the HUD.
 * `'probe'` — the day-1 capability probe. Five questions about what SDK7
 *             actually does on the mobile client; see docs/PROBE.md.
 *
 * The probe is still unanswered. Flip this one word, scan the QR, read the
 * five answers off the phone, and fill in the table in docs/PROBE.md. Both the
 * probe and this switch are deleted once those answers are recorded.
 */
const MODE: 'scene' | 'probe' = 'scene'

let mochi: Mochi | null = null

/**
 * PET — latch on press, survive the slide.
 *
 * The press is captured on the creature's own collider, but the release is
 * watched GLOBALLY and not on the entity. That asymmetry is the whole
 * forgiveness mechanism: a fat thumb that slides off the body mid-hold still
 * ends its own hold cleanly instead of leaving the creature stuck compressed.
 *
 * Mobile exposes no drag deltas at all — `screenDelta` always reports zero
 * there and gestures are not planned — so latch-and-timer is not a
 * simplification of a richer interaction. It is the only thing the platform
 * can express, and it happens to be the more forgiving design anyway.
 */
let petLatched = false

function petSystem() {
  if (!mochi) return

  if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, mochi.body)) {
    petLatched = true
    playPetDown()
    return
  }

  if (petLatched && inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_UP)) {
    petLatched = false
    playPetUp()
  }
}

/**
 * Local feed count — scaffolding, not the real thing.
 *
 * Size is meant to be the sum of every visitor's feedings, held by an
 * authoritative server that does not exist yet (day 6-7). This counter is
 * local, resets on reload, and is here only so the growth curve can be judged
 * by eye while tuning the aliveness. It is replaced wholesale by the server's
 * count and must never ship as the source of size.
 */
let localFeedCount = 0

function scene() {
  createMeadow()
  mochi = createMochi()
  setupAliveness(mochi)
  setupTouchControls()

  setupHud({
    onFeed: () => {
      if (!mochi) return
      localFeedCount++
      applyGrowth(mochi, localFeedCount)
      playEat()
    },
    onTeach: () => {
      // TEACH depends on whether the mobile client reports avatar emotes to
      // the scene, which probe check 2 exists to answer. Until it does, this
      // says so rather than pretending to work.
      say('teach is not wired yet')
    }
  })

  engine.addSystem(alivenessSystem)
  engine.addSystem(petSystem)
  engine.addSystem(hudSystem)
}

function probe() {
  setupProbeWorld()
  engine.addSystem(telemetrySystem)
  engine.addSystem(emoteProbeSystem)
  engine.addSystem(avatarEmoteLoopSystem)
  setupProbeHud()
}

export function main() {
  if (MODE === 'probe') probe()
  else scene()
}
