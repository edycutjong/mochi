/**
 * Mochi's body.
 *
 * A squashed sphere with two plane eyes. That is the whole creature — no rig,
 * no skeleton, no sculpted mesh. Everything that will read as "alive" is Tween
 * choreography applied to this geometry, which is why the geometry itself can
 * afford to be almost nothing.
 *
 * ## Why three entities and not one
 *
 * Size is the literal sum of every feeding, so it is *persistent* state. The
 * breathing, the waddle and the eat gulp are *transient* motion. Both are
 * scale. If they shared a Transform, every breath would overwrite the growth
 * accumulated by hundreds of visitors — the single most important number in
 * the design — and every feeding would fight the idle loop.
 *
 * So they are separated:
 *
 *   root  — position in the meadow, and the growth scale. Never tweened.
 *   body  — the sphere. All squash-stretch tweens land here, around 1.0.
 *   eyes  — planes parented to body, so they deform with it. That deformation
 *           is wanted: real squash-stretch carries the face with the mass.
 */

import {
  engine,
  Transform,
  MeshRenderer,
  MeshCollider,
  Material,
  PointerEvents,
  PointerEventType,
  InputAction,
  Entity
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4 } from '@dcl/sdk/math'
import { PALETTE, MOCHI_HOME, GROWTH } from '../config'

export type Mochi = {
  /** Position + growth. Never tweened. */
  root: Entity
  /** The sphere. All aliveness tweens target this. */
  body: Entity
}

/** Resting proportions — wider than tall, so it reads as a blob and not a ball. */
const BODY_SHAPE = Vector3.create(1.8, 1.45, 1.7)

function eye(parent: Entity, side: -1 | 1): Entity {
  const e = engine.addEntity()
  MeshRenderer.setPlane(e)
  Transform.create(e, {
    parent,
    // Local space is the unit sphere (radius 0.5), regardless of the parent's
    // non-uniform scale. 0.472 sits the plane just proud of the surface at
    // this x, close enough to avoid z-fighting without floating off the face.
    position: Vector3.create(0.15 * side, 0.05, 0.472),
    scale: Vector3.create(0.1, 0.17, 1)
  })
  Material.setPbrMaterial(e, {
    albedoColor: PALETTE.ink,
    emissiveColor: { r: PALETTE.ink.r, g: PALETTE.ink.g, b: PALETTE.ink.b },
    emissiveIntensity: 0.15,
    roughness: 1
  })
  return e
}

export function createMochi(): Mochi {
  const root = engine.addEntity()
  Transform.create(root, {
    position: Vector3.create(MOCHI_HOME.x, MOCHI_HOME.y, MOCHI_HOME.z),
    scale: Vector3.create(GROWTH.baseScale, GROWTH.baseScale, GROWTH.baseScale),
    // Face the spawn point, so a visitor arrives looking at its front.
    rotation: Quaternion.fromEulerDegrees(0, 180, 0)
  })

  const body = engine.addEntity()
  MeshRenderer.setSphere(body)
  Transform.create(body, {
    parent: root,
    // Half the body height, so the blob sits ON the meadow rather than in it.
    position: Vector3.create(0, BODY_SHAPE.y / 2, 0),
    scale: BODY_SHAPE
  })
  Material.setPbrMaterial(body, {
    albedoColor: PALETTE.bodyDeep,
    // Soft emissive: the creature should look lit from within on a dim phone
    // screen without needing a dynamic light, which mobile does not have.
    emissiveColor: { r: PALETTE.bodyLight.r, g: PALETTE.bodyLight.g, b: PALETTE.bodyLight.b },
    emissiveIntensity: 0.35,
    roughness: 0.85,
    metallic: 0
  })

  eye(body, -1)
  eye(body, 1)

  // PET is a hold directly on the body. The collider is what makes the whole
  // creature one big touch target — per the interaction spec, the hitbox is
  // deliberately the entire silhouette rather than a small button.
  MeshCollider.setSphere(body)
  PointerEvents.create(body, {
    pointerEvents: [
      {
        eventType: PointerEventType.PET_DOWN,
        eventInfo: { button: InputAction.IA_POINTER, hoverText: 'pet', maxDistance: 6 }
      },
      {
        eventType: PointerEventType.PET_UP,
        eventInfo: { button: InputAction.IA_POINTER, hoverText: 'pet', maxDistance: 6 }
      }
    ]
  })

  return { root, body }
}

/**
 * Applies accumulated growth to the root.
 *
 * Called with the authoritative feed count once the server exists. Until then
 * it is driven locally so the growth curve can be judged by eye.
 */
export function applyGrowth(mochi: Mochi, feedCount: number) {
  const s = Math.min(GROWTH.baseScale + feedCount * GROWTH.perFeed, GROWTH.maxScale)
  const t = Transform.getMutable(mochi.root)
  t.scale = Vector3.create(s, s, s)
}

/**
 * Makes hunger visible on the creature itself.
 *
 * Hunger is the return hook — you come back partly because it needs feeding —
 * so it has to be legible without a bar, a number or a label. A well-fed Mochi
 * glows warm and saturated; a hungry one goes pale and dim, like something that
 * has been waiting.
 *
 * Deliberately not a HUD element. This scene has two buttons and no instruction
 * text, and a status bar would be the third thing on screen competing with the
 * creature it describes. Putting the state *in the body* means a visitor reads
 * it in the same glance they read everything else.
 *
 * Never reaches zero, because the server's hunger never does — the floor is
 * what keeps the creature reading as needy rather than dying.
 */
export function applyHunger(mochi: Mochi, hunger: number) {
  const fed = Math.max(0, Math.min(1, hunger))

  // Pale toward the light body tone when hungry, deepen when fed.
  const albedo = Color4.create(
    PALETTE.bodyLight.r + (PALETTE.bodyDeep.r - PALETTE.bodyLight.r) * fed,
    PALETTE.bodyLight.g + (PALETTE.bodyDeep.g - PALETTE.bodyLight.g) * fed,
    PALETTE.bodyLight.b + (PALETTE.bodyDeep.b - PALETTE.bodyLight.b) * fed,
    1
  )

  Material.setPbrMaterial(mochi.body, {
    albedoColor: albedo,
    emissiveColor: { r: PALETTE.bodyLight.r, g: PALETTE.bodyLight.g, b: PALETTE.bodyLight.b },
    // The glow carries most of the signal: 0.12 when hungry, 0.45 when full.
    emissiveIntensity: 0.12 + fed * 0.33,
    roughness: 0.85,
    metallic: 0
  })
}
