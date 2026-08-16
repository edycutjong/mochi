/**
 * The chain replay — the moment the whole design is built around.
 *
 * A visitor teaches Mochi a move. Five seconds later they are watching a dance
 * whose every step was taught by a different named stranger, ending with the
 * thing they just did. That is the payload: not "N people visited" but a
 * performance authored by people who are not in the room, credited move by
 * move, finishing with you.
 *
 * ## How a sphere performs an emote
 *
 * Mochi has no rig and no animation data — it is a squashed sphere with two
 * plane eyes. So it cannot literally play "robot" or "dab". What it can do is
 * interpret each move as its own squash-stretch signature, and that turns out
 * to be the more honest reading of the mechanic anyway: the creature is not
 * imitating people, it is remembering what they taught it in the only language
 * its body has.
 *
 * Each signature below is deliberately distinguishable from its neighbours —
 * different amplitude, duration, tilt and easing. If two moves looked alike the
 * chain would read as one long wobble instead of a sequence of contributions.
 *
 * ## Why scale and tilt can run together
 *
 * A Tween replaces whatever tween was on its entity, so a single entity cannot
 * squash and tilt at once. Mochi is built as a root (position, growth,
 * rotation) parented to a body (the mesh, all squash). The replay drives scale
 * on the body and tilt on the root simultaneously, which is the payoff for a
 * split that existed for an entirely different reason.
 */

import {
  engine,
  Transform,
  Tween,
  TweenSequence,
  EasingFunction,
  TextShape,
  Billboard,
  Entity
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4, Color3 } from '@dcl/sdk/math'
import { Mochi } from './creature'
import { restingScale, squashTo, claimBody, releaseBody } from './aliveness'

export type ReplayMove = {
  emoteId: string
  teacherName: string
  /**
   * The move's position in the chain, as the server numbered it.
   *
   * Carried rather than derived from the array index: when the cap drops older
   * moves, an index would renumber everyone's contribution, and the number
   * floating over the creature's head has to be the one actually stored.
   */
  seq: number
}

/** One move's body language. */
type Signature = {
  /** Vertical squash factor: >1 stretches tall, <1 flattens wide. */
  y: number
  /** Degrees of lean. Zero for moves that read as purely vertical. */
  tilt: number
  ms: number
  easing: EasingFunction
}

/**
 * A distinct body language per teachable move.
 *
 * Tuned to be told apart at a glance on a small screen rather than to be
 * literal translations — "dab" is a lean because a lean is what a blob can do,
 * not because a blob can dab.
 */
const SIGNATURES: Record<string, Signature> = {
  wave: { y: 1.1, tilt: 14, ms: 520, easing: EasingFunction.EF_EASESINE },
  clap: { y: 0.84, tilt: 0, ms: 300, easing: EasingFunction.EF_EASEOUTQUAD },
  dance: { y: 1.22, tilt: 8, ms: 560, easing: EasingFunction.EF_EASEOUTBACK },
  raiseHand: { y: 1.34, tilt: 0, ms: 640, easing: EasingFunction.EF_EASEOUTCUBIC },
  fistpump: { y: 1.28, tilt: 0, ms: 340, easing: EasingFunction.EF_EASEOUTBACK },
  // Linear on purpose: no ease is what makes it read as mechanical.
  robot: { y: 0.9, tilt: 10, ms: 460, easing: EasingFunction.EF_LINEAR },
  kiss: { y: 1.06, tilt: -12, ms: 420, easing: EasingFunction.EF_EASEOUTSINE },
  shrug: { y: 0.8, tilt: 0, ms: 620, easing: EasingFunction.EF_EASESINE },
  dab: { y: 0.92, tilt: 26, ms: 400, easing: EasingFunction.EF_EASEOUTBACK },
  disco: { y: 1.18, tilt: 18, ms: 320, easing: EasingFunction.EF_EASEOUTQUAD },
  headexplode: { y: 1.45, tilt: 0, ms: 560, easing: EasingFunction.EF_EASEOUTELASTIC },
  tik: { y: 0.94, tilt: 6, ms: 240, easing: EasingFunction.EF_EASEOUTQUAD }
}

/** Anything taught from outside the picker still gets a body, never nothing. */
const DEFAULT_SIGNATURE: Signature = {
  y: 1.12,
  tilt: 6,
  ms: 460,
  easing: EasingFunction.EF_EASEOUTQUAD
}

/**
 * Longest chain replayed in one performance.
 *
 * Not a silent truncation: at roughly half a second a move, replaying an
 * unbounded chain would eventually run for minutes, and a visitor who cannot
 * leave is being held hostage rather than shown something. The most recent
 * moves are kept, because the newest is the visitor's own and that is the
 * ending the whole thing is built for. `onProgress` reports how many were
 * skipped so the scene can say so out loud rather than quietly dropping people.
 */
const MAX_MOVES = 24

/** Pause between moves, so the sequence reads as steps and not a blur. */
const GAP_MS = 90

let mochi: Mochi | null = null
/** The root's resting rotation — every tilt is relative to this. */
let baseRotation: Quaternion = Quaternion.Identity()
let creditLabel: Entity | null = null

let queue: ReplayMove[] = []
let index = 0
let untilNext = 0
let running = false
let onMove: ((move: ReplayMove, position: number, total: number) => void) | null = null

export function setupReplay(m: Mochi) {
  mochi = m
  baseRotation = Transform.get(m.root).rotation
}

export function isReplaying(): boolean {
  return running
}

/** Floating credit above the creature: the name of whoever taught this move. */
function showCredit(name: string, position: number) {
  if (!mochi) return
  clearCredit()

  const label = engine.addEntity()
  Transform.create(label, {
    parent: mochi.root,
    position: Vector3.create(0, 2.6, 0)
  })
  TextShape.create(label, {
    text: `${name}\ntaught move #${position}`,
    fontSize: 1.5,
    textColor: Color4.fromHexString('#B2436Aff'),
    outlineWidth: 0.14,
    outlineColor: Color3.fromHexString('#FFFFFFff')
  })
  Billboard.create(label)
  creditLabel = label
}

function clearCredit() {
  if (creditLabel === null) return
  engine.removeEntityWithChildren(creditLabel)
  creditLabel = null
}

/** Performs one move: squash on the body, lean on the root, name overhead. */
function perform(move: ReplayMove, position: number, total: number) {
  if (!mochi) return

  const sig = SIGNATURES[move.emoteId] ?? DEFAULT_SIGNATURE
  const rest = restingScale()

  Tween.createOrReplace(mochi.body, {
    mode: Tween.Mode.Scale({ start: rest, end: squashTo(sig.y) }),
    duration: sig.ms,
    easingFunction: sig.easing
  })
  // Yoyo so the move returns to rest on its own and the next one starts clean.
  TweenSequence.createOrReplace(mochi.body, {
    sequence: [
      {
        mode: Tween.Mode.Scale({ start: squashTo(sig.y), end: rest }),
        duration: sig.ms,
        easingFunction: sig.easing
      }
    ]
  })

  if (sig.tilt !== 0) {
    const leaned = Quaternion.multiply(baseRotation, Quaternion.fromEulerDegrees(0, 0, sig.tilt))
    Tween.createOrReplace(mochi.root, {
      mode: Tween.Mode.Rotate({ start: baseRotation, end: leaned }),
      duration: sig.ms,
      easingFunction: sig.easing
    })
    TweenSequence.createOrReplace(mochi.root, {
      sequence: [
        {
          mode: Tween.Mode.Rotate({ start: leaned, end: baseRotation }),
          duration: sig.ms,
          easingFunction: sig.easing
        }
      ]
    })
  }

  showCredit(move.teacherName, position)
  onMove?.(move, position, total)
}

function moveDuration(move: ReplayMove): number {
  const sig = SIGNATURES[move.emoteId] ?? DEFAULT_SIGNATURE
  // Out and back, plus a beat of stillness between contributions.
  return sig.ms * 2 + GAP_MS
}

export function stopReplay() {
  if (!running) return
  running = false
  queue = []
  index = 0
  clearCredit()
  if (mochi) {
    const t = Transform.getMutable(mochi.root)
    t.rotation = baseRotation
  }
  releaseBody()
}

/**
 * Replays the communal chain, oldest move first.
 *
 * `skipped` in the callback is how many older moves were left out by the cap,
 * so the scene can tell the visitor rather than silently shortening other
 * people's contributions out of the performance.
 */
export function startReplay(
  chain: ReplayMove[],
  handlers?: {
    onMove?: (move: ReplayMove, position: number, total: number) => void
    onStart?: (playing: number, skipped: number, total: number) => void
    onEnd?: () => void
  }
) {
  if (!mochi || chain.length === 0) return

  stopReplay()

  const skipped = Math.max(0, chain.length - MAX_MOVES)
  queue = chain.slice(-MAX_MOVES)
  index = 0
  untilNext = 0
  running = true
  onMove = handlers?.onMove ?? null
  endHandler = handlers?.onEnd ?? null

  const totalMs = queue.reduce((sum, m) => sum + moveDuration(m), 0)
  claimBody(totalMs / 1000 + 0.4)

  handlers?.onStart?.(queue.length, skipped, chain.length)
}

let endHandler: (() => void) | null = null

export function replaySystem(dt: number) {
  if (!running || !mochi) return

  untilNext -= dt
  if (untilNext > 0) return

  if (index >= queue.length) {
    const finished = endHandler
    stopReplay()
    finished?.()
    return
  }

  const move = queue[index]!
  perform(move, move.seq, queue.length)
  untilNext = moveDuration(move) / 1000
  index++
}
