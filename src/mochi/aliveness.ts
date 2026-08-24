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

type Beat = 'idle' | 'greeting' | 'eating' | 'petting' | 'replaying'

let mochi: Mochi | null = null
let beat: Beat = 'idle'
/** Seconds left before the current one-shot beat hands back to breathing. */
let beatRemaining = 0
/**
 * Quiet period after a waddle, before the creature will consider another.
 *
 * A visitor walking around inside `greetRadius` used to produce a greet, a
 * hand-back to idle, and then another greet on the very next frame the
 * distance check passed — an unbroken chain of them for as long as they moved.
 * Each one writes a fresh `Tween` and `TweenSequence` to both the root and the
 * body, so the cost was paid over and over while the creature shuffled
 * continuously toward a moving target. It showed up on a real phone as the
 * frame rate dipping whenever Mochi was moving.
 *
 * A pause between waddles is also what the beat is supposed to look like. A
 * creature that repositions itself every four hundred milliseconds does not
 * read as attentive, it reads as nervous.
 */
let greetCooldown = 0

/** Seconds of stillness between waddles. */
const GREET_COOLDOWN_SECONDS = 2.5

/**
 * Ground worth covering. Below this the waddle is invisible to the visitor and
 * is purely a tween nobody asked for.
 */
const GREET_MIN_STEP = 0.6
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

/** Resting proportions, so a set-piece can compute its own squashes. */
export function restingScale(): Vector3 {
  return rest
}

/** Volume-preserving squash relative to rest — shared with the chain replay. */
export function squashTo(y: number): Vector3 {
  return squash(y)
}

/**
 * Hands the body to a longer set-piece.
 *
 * The chain replay runs for many seconds and drives its own tweens move by
 * move. Rather than fight the idle loop for the same Transform, it claims the
 * body for a stated duration and this state machine keeps out of the way until
 * the claim lapses, then resumes breathing.
 */
export function claimBody(seconds: number) {
  beat = 'replaying'
  beatRemaining = seconds
}

/** True while a set-piece owns the body. */
export function bodyIsClaimed(): boolean {
  return beat === 'replaying'
}

/** Ends a claim early — used when a replay is cut short. */
export function releaseBody() {
  if (beat !== 'replaying' || !mochi) return
  beat = 'idle'
  breathe(mochi.body)
}

export function alivenessSystem(dt: number) {
  if (!mochi) return

  if (beatRemaining !== Infinity) beatRemaining -= dt
  if (greetCooldown > 0) greetCooldown -= dt

  // A finished one-shot hands the body back to the idle loop.
  if (beat !== 'idle' && beatRemaining <= 0) {
    const waddled = beat === 'greeting'
    beat = 'idle'
    breathe(mochi.body)
    // Stand still for a moment afterwards rather than immediately considering
    // the next waddle — see `greetCooldown`.
    if (waddled) greetCooldown = GREET_COOLDOWN_SECONDS
  }

  if (beat !== 'idle' || greetCooldown > 0) return

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

  // Not worth a tween the visitor cannot see — see `GREET_MIN_STEP`.
  if (flatDistance(want, here) < GREET_MIN_STEP) return

  playGreet(want)
}
