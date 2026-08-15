/**
 * The meadow — day-3 blockout.
 *
 * One parcel, one clearing, four objects. Everything here is a primitive with
 * a flat colour: the scene's whole visual budget is spent on the creature's
 * motion, and a detailed environment would only compete with it for attention
 * on a small screen.
 *
 * The berry bush, plaque and totem are placed but not yet wired — they are the
 * anchors for FEED, the carer log and the guestbook stamp respectively. They
 * exist now so the composition can be judged on a phone at the same time as
 * the aliveness, rather than the creature being evaluated against emptiness.
 */

import { engine, Transform, MeshRenderer, MeshCollider, Material, Entity } from '@dcl/sdk/ecs'
import { Vector3, Quaternion } from '@dcl/sdk/math'
import { PALETTE } from '../config'

export type Meadow = {
  bush: Entity
  plaque: Entity
  totem: Entity
}

function ground() {
  const e = engine.addEntity()
  MeshRenderer.setBox(e)
  MeshCollider.setBox(e)
  Transform.create(e, {
    position: Vector3.create(8, -0.05, 8),
    scale: Vector3.create(16, 0.1, 16)
  })
  Material.setPbrMaterial(e, { albedoColor: PALETTE.meadowNear, roughness: 1, metallic: 0 })
}

/**
 * A low ring of colour behind the creature.
 *
 * Reads as distance on a phone without costing geometry, and gives the pink
 * body a cool field to sit against so the silhouette stays separate from the
 * ground at small sizes.
 */
function backdrop() {
  const e = engine.addEntity()
  MeshRenderer.setCylinder(e, 7.4, 7.4)
  Transform.create(e, {
    position: Vector3.create(8, 0.02, 8),
    scale: Vector3.create(1, 0.02, 1)
  })
  Material.setPbrMaterial(e, { albedoColor: PALETTE.meadowFar, roughness: 1, metallic: 0 })
}

/** The berry bush — FEED's source. Tap here, then tap the creature. */
function bush(): Entity {
  const e = engine.addEntity()
  MeshRenderer.setSphere(e)
  MeshCollider.setSphere(e)
  Transform.create(e, {
    position: Vector3.create(11.6, 0.45, 6.6),
    scale: Vector3.create(1.1, 0.9, 1.1)
  })
  Material.setPbrMaterial(e, { albedoColor: PALETTE.meadowFar, roughness: 1 })

  // Berries: three accent spheres, the only saturated thing besides the
  // creature, so the eye finds the interaction without a label.
  const spots = [
    Vector3.create(0.3, 0.35, 0.3),
    Vector3.create(-0.32, 0.22, 0.26),
    Vector3.create(0.05, 0.42, -0.34)
  ]
  for (const s of spots) {
    const b = engine.addEntity()
    MeshRenderer.setSphere(b)
    Transform.create(b, { parent: e, position: s, scale: Vector3.create(0.22, 0.26, 0.22) })
    Material.setPbrMaterial(b, {
      albedoColor: PALETTE.accent,
      emissiveColor: { r: PALETTE.accent.r, g: PALETTE.accent.g, b: PALETTE.accent.b },
      emissiveIntensity: 0.3
    })
  }
  return e
}

/** The carer plaque — where the named away-line and today's carers will render. */
function plaque(): Entity {
  const e = engine.addEntity()
  MeshRenderer.setBox(e)
  MeshCollider.setBox(e)
  Transform.create(e, {
    position: Vector3.create(5.0, 0.62, 6.4),
    rotation: Quaternion.fromEulerDegrees(-18, 22, 0),
    scale: Vector3.create(1.5, 0.95, 0.08)
  })
  Material.setPbrMaterial(e, { albedoColor: PALETTE.sky, roughness: 0.9 })
  return e
}

/** The totem — one tap closes a visit with a guestbook stamp. */
function totem(): Entity {
  const e = engine.addEntity()
  MeshRenderer.setCylinder(e, 0.28, 0.34)
  MeshCollider.setCylinder(e, 0.28, 0.34)
  Transform.create(e, {
    position: Vector3.create(10.2, 0.55, 10.4),
    scale: Vector3.create(1, 1.1, 1)
  })
  Material.setPbrMaterial(e, { albedoColor: PALETTE.bodyLight, roughness: 0.9 })
  return e
}

export function createMeadow(): Meadow {
  ground()
  backdrop()
  return { bush: bush(), plaque: plaque(), totem: totem() }
}
