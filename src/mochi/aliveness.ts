/**
 * The aliveness language — day-4 deliverable and the day-5 gate.
 *
 * Every bit of "cuteness" in this project is Tween choreography on a squashed
 * sphere. There is no rig and no animation data. If this does not read as cute
 * on a real phone, no amount of mechanism underneath it recovers, which is why
 * this file exists before the server, the chain, or the plaque.
 *
 * ## The one rule
 *
 * Squash and stretch preserve volume. When the creature gets taller it gets
 * narrower, and when it flattens it spreads. Skipping that is the difference
 * between a living thing and a pulsing ball — it costs nothing here beyond
 * multiplying two axes in the opposite direction.
 *
 * ## State
 *
 * One creature, one motion at a time. A tween on an entity replaces whatever
 * tween was there, so overlapping beats do not blend — they cut. The state
 * machine exists to make those cuts deliberate: a one-shot beat claims the
 * body, runs for a known duration, and hands back to breathing.
 */

import { engine, Transform, Tween, TweenSequence, EasingFunction, TweenLoop, Entity } from '@dcl/sdk/ecs'
import { Vector3 } from '@dcl/sdk/math'
import { MOTION, MOCHI_HOME } from '../config'
import { Mochi } from './creature'

type Beat = 'idle' | 'greeting' | 'eating' | 'petting'

let mochi: Mochi | null = null
let beat: Beat = 'idle'
/** Seconds left before the current one-shot beat hands back to breathing. */
let beatRemaining = 0
/** Resting proportions, captured at setup so every beat is relative to it. */
let rest: Vector3 = Vector3.One()

/** Volume-preserving squash. `y` > 1 stretches tall and thin, < 1 flattens wide. */
function squash(y: number): Vector3 {
  const lateral = 1 / Math.sqrt(y)
  return Vector3.create(rest.x * lateral, rest.y * y, rest.z * lateral)
}

/**
 * Idle breathing.
 *
 * Deliberately almost invisible — 4% over 2.4s. The purpose is not to be seen
 * as motion but to keep the silhouette from ever being perfectly still, which
 * is what makes a static mesh read as an object rather than a creature.
 */
function breathe(body: Entity) {
  Tween.createOrReplace(body, {
    mode: Tween.Mode.Scale({ start: rest, end: squash(MOTION.breatheScale) }),
    duration: MOTION.breatheMs,
    easingFunction: EasingFunction.EF_EASESINE
  })
  TweenSequence.createOrReplace(body, { sequence: [], loop: TweenLoop.TL_YOYO })
}

/**
 * Eat gulp: anticipation, then the swallow, then a settle that overshoots.
 *
 * The anticipation squash is the part that sells it. Going straight to the
 * stretch reads as a glitch; compressing first reads as intent.
 */
export function playEat() {
  if (!mochi) return
  const body = mochi.body

  Tween.createOrReplace(body, {
    mode: Tween.Mode.Scale({ start: rest, end: squash(0.82) }),
    duration: MOTION.eatSquashMs,
    easingFunction: EasingFunction.EF_EASEOUTQUAD
  })
  TweenSequence.createOrReplace(body, {
    sequence: [
      {
        mode: Tween.Mode.Scale({ start: squash(0.82), end: squash(1.25) }),
        duration: MOTION.eatStretchMs,
        easingFunction: EasingFunction.EF_EASEOUTBACK
      },
      {
        mode: Tween.Mode.Scale({ start: squash(1.25), end: rest }),
        // Elastic on the settle is the wobble. It is the single most
        // "alive-looking" easing in the set and costs one enum value.
        duration: MOTION.eatSettleMs,
        easingFunction: EasingFunction.EF_EASEOUTELASTIC
      }
    ]
  })

  beat = 'eating'
  beatRemaining = (MOTION.eatSquashMs + MOTION.eatStretchMs + MOTION.eatSettleMs) / 1000
}

/**
 * PET, pressed.
 *
 * Compresses and STAYS compressed — the hold is latched on press, so the
 * creature is visibly under the thumb for as long as the finger is down.
 * There is no progress ring and no fail state; the deformation is the
 * feedback.
 */
export function playPetDown() {
  if (!mochi) return
  Tween.createOrReplace(mochi.body, {
    mode: Tween.Mode.Scale({ start: rest, end: squash(0.88) }),
    duration: 160,
    easingFunction: EasingFunction.EF_EASEOUTQUAD
  })
  TweenSequence.createOrReplace(mochi.body, { sequence: [] })
  beat = 'petting'
  beatRemaining = Infinity
}

/** PET, released — springs back past rest and settles. */
export function playPetUp() {
  if (!mochi) return
  Tween.createOrReplace(mochi.body, {
    mode: Tween.Mode.Scale({ start: squash(0.88), end: rest }),
    duration: 620,
    easingFunction: EasingFunction.EF_EASEOUTELASTIC
  })
  TweenSequence.createOrReplace(mochi.body, { sequence: [] })
  beat = 'eating' // borrow the one-shot path; hands back to idle on timeout
  beatRemaining = 0.62
}

/**
 * Waddle-greet.
 *
 * Two alternating squashes while the root walks toward the visitor. The tilt
 * that would sell it further needs a rotation tween running concurrently with
 * the move, which the Tween component cannot do on one entity — noted as a
 * day-5 refinement rather than faked here.
 */
function playGreet(target: Vector3) {
  if (!mochi) return
  const from = Transform.get(mochi.root).position

  Tween.createOrReplace(mochi.root, {
    mode: Tween.Mode.Move({ start: from, end: target }),
    duration: MOTION.greetStepMs * 2,
    easingFunction: EasingFunction.EF_EASESINE
  })

  Tween.createOrReplace(mochi.body, {
    mode: Tween.Mode.Scale({ start: rest, end: squash(MOTION.greetSquash) }),
    duration: MOTION.greetStepMs,
    easingFunction: EasingFunction.EF_EASESINE
  })
  TweenSequence.createOrReplace(mochi.body, { sequence: [], loop: TweenLoop.TL_YOYO })

  beat = 'greeting'
  beatRemaining = (MOTION.greetStepMs * 2) / 1000
}

/** Distance on the ground plane — height differences are irrelevant here. */
function flatDistance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}

export function setupAliveness(m: Mochi) {
  mochi = m
  rest = Transform.get(m.body).scale
  breathe(m.body)
}

export function alivenessSystem(dt: number) {
  if (!mochi) return

  if (beatRemaining !== Infinity) beatRemaining -= dt

  // A finished one-shot hands the body back to the idle loop.
  if (beat !== 'idle' && beatRemaining <= 0) {
    beat = 'idle'
    breathe(mochi.body)
  }

  if (beat !== 'idle') return

  // Greet: only from rest, and only for someone who has come close enough to
  // be looking at the creature rather than passing by.
  const player = Transform.getOrNull(engine.PlayerEntity)
  if (!player) return

  const here = Transform.get(mochi.root).position
  const toPlayer = flatDistance(here, player.position)
  if (toPlayer > MOTION.greetRadius || toPlayer < 2.2) return

  // Stop short of the visitor, and never wander far from home.
  const dir = Vector3.normalize(Vector3.create(player.position.x - here.x, 0, player.position.z - here.z))
  const want = Vector3.create(
    player.position.x - dir.x * 2.0,
    MOCHI_HOME.y,
    player.position.z - dir.z * 2.0
  )
  const home = Vector3.create(MOCHI_HOME.x, MOCHI_HOME.y, MOCHI_HOME.z)
  if (flatDistance(want, home) > 3.5) return

  playGreet(want)
}
