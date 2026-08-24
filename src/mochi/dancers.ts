/**
 * Memory dancers — the absent people, made visible.
 *
 * Each dancer is one entry from the chain: a stranger's avatar, wearing what
 * they wore, performing the move they taught, with their name above them. They
 * are the difference between "30 people have visited" and standing in a
 * clearing with thirty of them.
 *
 * ## Why this file is built as a ladder and not as a feature
 *
 * Dancers are the only elastic cost in the scene — everything else is a fixed
 * handful of primitives. They are also the one element with a documented risk
 * of not rendering on the mobile client at all.
 *
 * So the quality level is a variable, not an assumption:
 *
 *   avatars-6  →  avatars-3  →  nametags
 *
 * The bottom rung is not a degraded experience, it is the same idea drawn more
 * cheaply: a name floating where a person stood. The chain, the credit and the
 * order all survive at every rung. Only the fidelity of the bodies changes,
 * which means neither a frame-rate problem nor a platform gap can take the
 * mechanic away — they can only make it plainer.
 *
 * ## Avatar animations play once
 *
 * `AvatarShape` emotes are one-shot. Looping requires bumping
 * `expressionTriggerTimestamp`, which is what `danceLoopSystem` does. Without
 * it the clearing fills with people standing perfectly still, which reads as
 * broken rather than as memory.
 *
 * ## Why the ring remembers what it drew
 *
 * The server broadcasts the whole world after *every* successful mutation,
 * including a pet — which one wallet may send ten times a minute. Almost none
 * of those broadcasts change the chain at all. Rebuilding on each one would
 * destroy and recreate up to six `AvatarShape` entities, the single most
 * expensive instantiation the mobile client performs, up to ten times a minute
 * *per other visitor in the clearing* — so the more people are here, the worse
 * the frame rate gets, which is the exact opposite of what this scene is for.
 *
 * So `setDancers` compares a signature of what it is being asked to draw
 * against what is already standing there, and returns without touching the
 * engine when they match. "Match" means the same moves, taught by the same
 * people, wearing the same things, in the same order — not the same objects:
 * every broadcast arrives as freshly parsed JSON, so object identity is never
 * equal and comparing it would skip nothing.
 */

import { engine, Transform, AvatarShape, TextShape, Billboard, Entity } from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4, Color3 } from '@dcl/sdk/math'
import { MOCHI_HOME } from '../config'

export type ChainEntry = {
  emoteId: string
  teacherName: string
  /** Wearable URNs, so the dancer is dressed as that person actually was. */
  wearables: string[]
}

export type Fidelity = 'avatars-6' | 'avatars-3' | 'nametags'

const CAPACITY: Record<Fidelity, number> = {
  'avatars-6': 6,
  'avatars-3': 3,
  nametags: 6
}

/** Re-trigger interval. Long enough not to cut emotes off mid-performance. */
const LOOP_SECONDS = 6

type Dancer = { root: Entity; emoteId: string; isAvatar: boolean }

let dancers: Dancer[] = []
let fidelity: Fidelity = 'avatars-6'
let sinceRetrigger = 0
let retriggerCount = 0
/** Signature of the ring currently standing in the meadow. Null when empty. */
let standing: string | null = null
/**
 * The last chain we were asked to draw, kept so a rung change can redraw
 * immediately.
 *
 * Without it, dropping a rung only takes effect on the next server broadcast.
 * That is the wrong moment: the watchdog drops a rung precisely because frames
 * are being missed *now*, and a quiet clearing with nobody tending the creature
 * can go minutes without a broadcast — so the relief would arrive long after
 * the visitor who needed it had left.
 */
let lastChain: ChainEntry[] | null = null

/**
 * A stable identity for a ring: the moves, their teachers, their clothes, in
 * order, at a given fidelity.
 *
 * Fidelity is part of it because it decides both how many entries are drawn
 * and what kind of entity each one becomes — the same chain at a different
 * rung is a different ring and must be rebuilt.
 *
 * Serialised rather than joined with a separator: a display name and a
 * wearable urn are both free text, and any character a separator could use is
 * one they may legally contain — which is all it takes for two different rings
 * to collide into one signature and silently stop redrawing.
 */
/**
 * One ghost per PERSON, not per move.
 *
 * The chain is a list of moves, and slicing it directly meant a visitor who
 * taught six moves got six identical copies of themselves standing in the ring.
 * That is not merely uncanny — it is a false claim. The ring is the scene's
 * visual assertion of how many people have tended the creature, and a project
 * whose whole premise is "every visible property was produced by somebody else"
 * cannot draw one person six times and let it read as six.
 *
 * The most recent move wins, and re-teaching moves that person to the end of
 * the ring, so the order is who-contributed-most-recently rather than an
 * arbitrary first-seen order. With one carer this draws exactly one ghost,
 * which is the honest picture; with six people it draws the intended one.
 */
function oneDancerPerTeacher(chain: ChainEntry[]): ChainEntry[] {
  const byTeacher = new Map<string, ChainEntry>()
  for (const entry of chain) {
    byTeacher.delete(entry.teacherName)
    byTeacher.set(entry.teacherName, entry)
  }
  return [...byTeacher.values()]
}

function ringSignature(chain: ChainEntry[], level: Fidelity): string {
  const recent = oneDancerPerTeacher(chain).slice(-CAPACITY[level])
  return JSON.stringify([level, recent.map((e) => [e.emoteId, e.teacherName, e.wearables])])
}

/** Places dancers on a ring around the creature, facing inward. */
function placement(index: number, total: number): { position: Vector3; rotation: Quaternion } {
  const radius = 4.2
  // Offset by half a step so no dancer stands directly between the spawn
  // point and the creature.
  const angle = ((index + 0.5) / total) * Math.PI * 2
  const x = MOCHI_HOME.x + Math.cos(angle) * radius
  const z = MOCHI_HOME.z + Math.sin(angle) * radius
  const facing = (Math.atan2(MOCHI_HOME.x - x, MOCHI_HOME.z - z) * 180) / Math.PI
  return {
    position: Vector3.create(x, MOCHI_HOME.y, z),
    rotation: Quaternion.fromEulerDegrees(0, facing, 0)
  }
}

function nameTag(parent: Entity, name: string, height: number) {
  const tag = engine.addEntity()
  Transform.create(tag, { parent, position: Vector3.create(0, height, 0) })
  TextShape.create(tag, {
    text: name,
    fontSize: 1.4,
    textColor: Color4.fromHexString('#4A3B52ff'),
    outlineWidth: 0.12,
    outlineColor: Color3.fromHexString('#FFFFFFff')
  })
  Billboard.create(tag)
}

function spawnAvatar(entry: ChainEntry, index: number, total: number): Dancer {
  const root = engine.addEntity()
  const { position, rotation } = placement(index, total)
  Transform.create(root, { position, rotation })

  AvatarShape.create(root, {
    id: `dancer-${index}`,
    name: '', // the name is drawn as a tag, so it reads at the same size for everyone
    bodyShape: 'urn:decentraland:off-chain:base-avatars:BaseFemale',
    wearables: entry.wearables,
    emotes: [],
    expressionTriggerId: entry.emoteId,
    expressionTriggerTimestamp: 0
  })

  nameTag(root, entry.teacherName, 2.3)
  return { root, emoteId: entry.emoteId, isAvatar: true }
}

/**
 * The bottom rung: a name where a person stood.
 *
 * Costs one text entity and renders on anything. The clearing still says "many
 * different people were here, in this order, and here is what they are called".
 */
function spawnNameTag(entry: ChainEntry, index: number, total: number): Dancer {
  const root = engine.addEntity()
  const { position } = placement(index, total)
  Transform.create(root, { position })
  nameTag(root, entry.teacherName, 1.7)
  return { root, emoteId: entry.emoteId, isAvatar: false }
}

export function clearDancers() {
  for (const d of dancers) engine.removeEntityWithChildren(d.root)
  dancers = []
  standing = null
}

export function setFidelity(next: Fidelity) {
  if (next === fidelity) return
  fidelity = next
  // The rung is part of what the ring is, so dropping down one has to redraw
  // even though the chain behind it has not moved.
  standing = null
  // Redraw now rather than at the next broadcast — see `lastChain`.
  if (lastChain !== null) setDancers(lastChain)
}

export function getFidelity(): Fidelity {
  return fidelity
}

/**
 * Renders the most recent entries in the chain as dancers.
 *
 * Most recent rather than a sample: the people who were here lately are the
 * ones whose presence makes the place feel currently inhabited.
 *
 * Idempotent. Called on every state the server sends — most of which are pets
 * and feedings that leave the chain untouched — and does nothing at all when
 * the ring it is asked for is the ring already standing there.
 */
export function setDancers(chain: ChainEntry[]) {
  lastChain = chain
  const signature = ringSignature(chain, fidelity)
  if (signature === standing) return

  clearDancers()

  const capacity = CAPACITY[fidelity]
  const recent = oneDancerPerTeacher(chain).slice(-capacity)
  const total = Math.max(recent.length, 1)

  recent.forEach((entry, i) => {
    dancers.push(
      fidelity === 'nametags' ? spawnNameTag(entry, i, total) : spawnAvatar(entry, i, total)
    )
  })

  standing = signature
}

/** Re-triggers each dancer's emote, because avatar animations play once. */
export function danceLoopSystem(dt: number) {
  if (dancers.length === 0) return

  sinceRetrigger += dt
  if (sinceRetrigger < LOOP_SECONDS) return
  sinceRetrigger = 0
  retriggerCount++

  for (const d of dancers) {
    if (!d.isAvatar) continue
    const shape = AvatarShape.getMutableOrNull(d.root)
    if (!shape) continue
    shape.expressionTriggerId = d.emoteId
    shape.expressionTriggerTimestamp = retriggerCount
  }
}
