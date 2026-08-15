/**
 * Day-1 capability probe — the physical objects.
 *
 * Checks 1, 3 and 4 cannot be auto-detected: whether a thing RENDERS is only
 * answerable by a human looking at a phone. So each is placed at a known spot,
 * in the spawn camera's view, next to a reference object that makes a wrong
 * result obvious rather than a judgement call.
 *
 * Everything here is throwaway. None of it survives into the real scene — it
 * exists to turn five unknowns into five answers before any of them can cost a
 * week.
 */

import {
  engine,
  Transform,
  MeshRenderer,
  Material,
  AvatarShape,
  TextShape,
  ParticleSystem,
  Billboard,
  Entity
} from '@dcl/sdk/ecs'
import { Color3, Color4, Vector3, Quaternion } from '@dcl/sdk/math'

/** Emote driven on the probe avatar, to test looping via timestamp bumping. */
const PROBE_EMOTE = 'robot'

let probeAvatar: Entity | null = null

function ground() {
  const entity = engine.addEntity()
  MeshRenderer.setBox(entity)
  Transform.create(entity, {
    position: Vector3.create(8, -0.05, 8),
    scale: Vector3.create(16, 0.1, 16)
  })
  Material.setPbrMaterial(entity, {
    albedoColor: Color4.fromHexString('#c9e4b8ff'),
    roughness: 1
  })
}

/**
 * CHECK 1 — does AvatarShape render on the mobile client?
 *
 * The memory-dancer mechanic (absent carers replayed as their own dressed
 * avatars) depends on this. Docs list no mobile limitation for AvatarShape, but
 * a nearby known issue reads "Unity client avatars not visible on mobile app",
 * which is close enough to warrant checking rather than assuming.
 *
 * Placed LEFT of centre, beside a marker post of known height so "is it there"
 * and "is it the right size" are both answerable at a glance.
 */
function avatarCheck() {
  probeAvatar = engine.addEntity()
  Transform.create(probeAvatar, {
    position: Vector3.create(5.5, 0, 8),
    rotation: Quaternion.fromEulerDegrees(0, 180, 0)
  })
  AvatarShape.create(probeAvatar, {
    id: 'probe-avatar',
    name: 'CHECK 1',
    bodyShape: 'urn:decentraland:off-chain:base-avatars:BaseFemale',
    wearables: [],
    emotes: [],
    expressionTriggerId: PROBE_EMOTE,
    expressionTriggerTimestamp: 0
  })

  // A 1.8m post next to it: a rendered avatar should read about this tall.
  const post = engine.addEntity()
  MeshRenderer.setBox(post)
  Transform.create(post, {
    position: Vector3.create(4.6, 0.9, 8),
    scale: Vector3.create(0.12, 1.8, 0.12)
  })
  Material.setPbrMaterial(post, { albedoColor: Color4.fromHexString('#5b7fa6ff') })
}

/**
 * Re-triggers the probe avatar's emote on a timer.
 *
 * AvatarShape animations play ONCE — looping requires bumping
 * expressionTriggerTimestamp. Verifying that here means the memory dancers can
 * be built on it later without discovering the limitation mid-build.
 */
let sinceRetrigger = 0
let retriggerCount = 0
export function avatarEmoteLoopSystem(dt: number) {
  if (!probeAvatar) return
  sinceRetrigger += dt
  if (sinceRetrigger < 4) return
  sinceRetrigger = 0

  const shape = AvatarShape.getMutableOrNull(probeAvatar)
  if (!shape) return
  shape.expressionTriggerId = PROBE_EMOTE
  shape.expressionTriggerTimestamp = ++retriggerCount
}

/**
 * CHECK 3 — do particles render on mobile?
 *
 * Docs answer this already: the mobile missing-features page lists "SDK
 * Particle System Support" as arriving July–August 2026. Today sits at the tail
 * of that window with no shipped confirmation, so this is checking whether the
 * fix has landed rather than discovering the gap.
 *
 * The design assumes NO particles regardless. A pass here is upside, not a
 * dependency.
 */
function particleCheck() {
  const entity = engine.addEntity()
  Transform.create(entity, { position: Vector3.create(10.5, 1.2, 8) })
  ParticleSystem.create(entity, {
    active: true,
    rate: 30,
    maxParticles: 200,
    lifetime: 2,
    gravity: -0.5
  })

  // Marker post, so "no particles" is distinguishable from "looking at the
  // wrong patch of empty meadow".
  const post = engine.addEntity()
  MeshRenderer.setBox(post)
  Transform.create(post, {
    position: Vector3.create(10.5, 0.3, 8),
    scale: Vector3.create(0.12, 0.6, 0.12)
  })
  Material.setPbrMaterial(post, { albedoColor: Color4.fromHexString('#a65b8fff') })
}

/**
 * CHECK 4 — does TextShape sit where it does on desktop?
 *
 * There is a live documented bug: "UI/TextShape elements positioned at
 * different heights on mobile vs Unity", ETA August 2026. The carer plaque and
 * the named away-line are both TextShape, so a vertical offset is a real
 * problem worth measuring rather than eyeballing later.
 *
 * The text is pinned at exactly y=2.0, level with the top face of the reference
 * cube beside it. On desktop they line up. Any mobile offset is then visible as
 * a gap rather than a guess.
 */
function textCheck() {
  const label = engine.addEntity()
  Transform.create(label, { position: Vector3.create(8, 2.0, 10) })
  TextShape.create(label, {
    text: 'CHECK 4 — level with cube top',
    fontSize: 2,
    textColor: Color4.fromHexString('#22303aff'),
    outlineWidth: 0.1,
    outlineColor: Color3.fromHexString('#ffffffff')
  })
  Billboard.create(label)

  // Reference cube: 1m cube centred at y=1.5, so its TOP face is exactly y=2.0.
  const cube = engine.addEntity()
  MeshRenderer.setBox(cube)
  Transform.create(cube, {
    position: Vector3.create(6.8, 1.5, 10),
    scale: Vector3.create(1, 1, 1)
  })
  Material.setPbrMaterial(cube, { albedoColor: Color4.fromHexString('#e8c65bff') })
}

export function setupProbeWorld() {
  ground()
  avatarCheck()
  particleCheck()
  textCheck()
}
