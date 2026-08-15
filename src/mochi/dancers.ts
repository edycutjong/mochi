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
}

export function setFidelity(next: Fidelity) {
  if (next === fidelity) return
  fidelity = next
}

export function getFidelity(): Fidelity {
  return fidelity
}

/**
 * Renders the most recent entries in the chain as dancers.
 *
 * Most recent rather than a sample: the people who were here lately are the
 * ones whose presence makes the place feel currently inhabited.
 */
export function setDancers(chain: ChainEntry[]) {
  clearDancers()

  const capacity = CAPACITY[fidelity]
  const recent = chain.slice(-capacity)
  const total = Math.max(recent.length, 1)

  recent.forEach((entry, i) => {
    dancers.push(
      fidelity === 'nametags' ? spawnNameTag(entry, i, total) : spawnAvatar(entry, i, total)
    )
  })
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
