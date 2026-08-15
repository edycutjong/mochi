import { engine, inputSystem, InputAction, PointerEventType } from '@dcl/sdk/ecs'

import { createMochi, applyGrowth, Mochi } from './mochi/creature'
import { createMeadow } from './mochi/meadow'
import { setupAliveness, alivenessSystem, playEat, playPetDown, playPetUp } from './mochi/aliveness'
import { createPlaque, renderPlaque, ago } from './mochi/plaque'
import { emoteObserverSystem, onTaught, teachFromPicker, localIdentity, TaughtMove } from './mochi/teach'
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

/**
 * The chain, held locally until the server owns it.
 *
 * Same status as the feed counter: scaffolding, replaced wholesale. It exists
 * so the TEACH → credit → replay loop can be walked end to end on a phone
 * before the persistence layer lands.
 */
const localChain: TaughtMove[] = []
const localCarers: string[] = []

function scene() {
  const meadow = createMeadow()
  mochi = createMochi()
  setupAliveness(mochi)
  setupTouchControls()
  createPlaque(meadow.plaque)

  onTaught((move) => {
    localChain.push(move)
    // The credit is the payload of the whole mechanic — the name of the
    // stranger, attached to the move, said out loud.
    say(`${move.teacherName} taught move #${localChain.length}`)
    refreshPlaque()
  })

  setupHud({
    onFeed: () => {
      if (!mochi) return
      const who = localIdentity()
      localFeedCount++
      applyGrowth(mochi, localFeedCount)
      playEat()
      if (who && !localCarers.includes(who.name)) localCarers.unshift(who.name)
      lastFedAt = Date.now()
      lastFedBy = who?.name ?? ''
      refreshPlaque()
    },
    onTeach: (emoteId) => {
      void teachFromPicker(emoteId)
    }
  })

  refreshPlaque()

  engine.addSystem(alivenessSystem)
  engine.addSystem(petSystem)
  engine.addSystem(hudSystem)
  engine.addSystem(emoteObserverSystem)
}

let lastFedAt = 0
let lastFedBy = ''

function refreshPlaque() {
  renderPlaque({
    lastFedBy,
    lastFedAgo: lastFedAt ? ago(Date.now() - lastFedAt) : '',
    todaysCarers: localCarers,
    // The away-line names the person whose act followed yours. It is a server
    // query over other people's history, so there is nothing honest to show
    // until the server exists — an invented name here would be a lie about a
    // human being, which is the one thing this scene must never render.
    awayLine: ''
  })
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
