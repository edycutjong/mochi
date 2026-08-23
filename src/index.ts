import { engine, inputSystem, InputAction, PointerEventType, PointerEvents } from '@dcl/sdk/ecs'

import { SERVER_URL } from './config'
import { createMochi, applyGrowth, applyHunger, Mochi } from './mochi/creature'
import { createMeadow, Meadow } from './mochi/meadow'
import { setupAliveness, alivenessSystem, playEat, playPetDown, playPetUp } from './mochi/aliveness'
import { createPlaque, renderPlaque, ago } from './mochi/plaque'
import { emoteObserverSystem, onTaught, teachFromPicker, sessionIdentity } from './mochi/teach'
import { setDancers, danceLoopSystem } from './mochi/dancers'
import { setupReplay, startReplay, replaySystem, isReplaying } from './mochi/replay'
import { setupHud, hudSystem, say } from './ui/hud'
import { setupTouchControls } from './ui/controls'
import { connect, send, canWrite, currentState } from './net/client'

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
 * The probe has been run on a real device and its table is filled in; one row
 * (emote observation) is still open and is no longer load-bearing, because the
 * picker route does not depend on it. Flip this one word to re-run it. Both the
 * probe and this switch are deleted once that last row is recorded.
 */
const MODE: 'scene' | 'probe' = 'scene'

let mochi: Mochi | null = null
let meadow: Meadow | null = null

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
  if (!mochi || !meadow) return

  if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, mochi.body)) {
    petLatched = true
    playPetDown()
    return
  }

  if (petLatched && inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_UP)) {
    petLatched = false
    playPetUp()
    if (canWrite()) send({ t: 'pet' })
  }

  // The guestbook stamp closes a visit. One tap, no confirmation.
  if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, meadow.totem)) {
    if (canWrite()) {
      send({ t: 'stamp' })
      say('your visit is in the guestbook')
    }
  }
}

/**
 * Renders whatever the server last said.
 *
 * Everything visible about the creature is derived here and nowhere else. The
 * client holds no counter of its own, so there is no second version of the
 * truth that could drift from the one every other visitor sees.
 */
/**
 * True while we are waiting for our own teach to come back from the server.
 *
 * The replay fires on the state that contains the visitor's own move, not on
 * the local animation — so what they watch is the chain the server actually
 * stored, ending with their contribution as everyone else will see it.
 */
let awaitingOwnTeach = false
let lastChainLength = -1

function renderFromServer() {
  const state = currentState()
  if (!state || !mochi) return

  applyGrowth(mochi, state.pet.feedCount)
  applyHunger(mochi, state.pet.hunger)

  renderPlaque({
    // The server's genesis row carries a stand-in rather than a name. Treating
    // it as one would put a person on the plaque who does not exist.
    lastFedBy: state.pet.feedCount > 0 ? state.pet.lastFedBy : '',
    lastFedAgo: state.pet.feedCount > 0 ? ago(state.now - state.pet.lastFedAt) : '',
    todaysCarers: state.carers.map((c) => c.name),
    awayLine: ''
  })

  setDancers(
    state.chain.map((m) => ({
      emoteId: m.emoteId,
      teacherName: m.teacherName,
      wearables: m.wearables
    }))
  )

  // The payoff: the visitor's move landed, so play back the whole chain and let
  // them watch a dance authored by named strangers that ends with them.
  const grew = state.chainLength > lastChainLength && lastChainLength >= 0
  lastChainLength = state.chainLength

  if (awaitingOwnTeach && grew && !isReplaying()) {
    awaitingOwnTeach = false
    startReplay(
      state.chain.map((m) => ({ emoteId: m.emoteId, teacherName: m.teacherName, seq: m.seq })),
      {
        onStart: (playing, skipped, total) => {
          say(
            skipped > 0
              ? `replaying the last ${playing} of ${total} moves`
              : `replaying all ${total} moves`,
            4
          )
        },
        onEnd: () => say('the chain is yours now', 4)
      }
    )
  }
}

function scene() {
  meadow = createMeadow()
  mochi = createMochi()
  setupAliveness(mochi)
  setupReplay(mochi)
  setupTouchControls()
  createPlaque(meadow.plaque)

  // The totem is tappable; the plaque is not. Reading needs no permission.
  PointerEvents.createOrReplace(meadow.totem, {
    pointerEvents: [
      {
        eventType: PointerEventType.PET_DOWN,
        eventInfo: { button: InputAction.IA_POINTER, hoverText: 'sign the guestbook', maxDistance: 6 }
      }
    ]
  })

  const who = sessionIdentity()
  if (who) {
    connect(SERVER_URL, who, {
      onState: renderFromServer,
      onAwayLine: (line) => {
        // The one sentence addressed to this person rather than to the room.
        say(`${line.name} ${line.kind === 'feed' ? 'fed' : 'tended'} Mochi after you left`, 7)
      },
      onRefused: (code) => {
        if (code === 'rate_limited') say('Mochi has had plenty for now')
        else if (code === 'guest_read_only') say('sign in with a wallet to leave your mark')
      },
      onLink: (up) => {
        // Going down says nothing: the last state stays on screen and a
        // notice would only draw attention to a gap the visitor cannot act on.
        if (up) renderFromServer()
      }
    })
  }

  // A move taught here plays locally at once and is sent for the server to
  // make permanent. The animation is optimistic; the record is not.
  onTaught((move) => {
    if (!canWrite()) {
      say('sign in with a wallet to teach a move')
      return
    }
    awaitingOwnTeach = true
    send({ t: 'teach', emoteId: move.emoteId, wearables: move.wearables })
  })

  setupHud({
    onFeed: () => {
      if (!canWrite()) {
        say('sign in with a wallet to feed Mochi')
        return
      }
      // Plays immediately, counts when the server says so.
      playEat()
      send({ t: 'feed' })
    },
    onTeach: (emoteId) => {
      void teachFromPicker(emoteId)
    }
  })

  engine.addSystem(alivenessSystem)
  engine.addSystem(petSystem)
  engine.addSystem(hudSystem)
  engine.addSystem(emoteObserverSystem)
  engine.addSystem(danceLoopSystem)
  engine.addSystem(replaySystem)
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
