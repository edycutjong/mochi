/**
 * The meadow — and every verb in the scene.
 *
 * One parcel, one clearing, a handful of objects. Everything here is a
 * primitive with a flat colour: the scene's whole visual budget is spent on the
 * creature's motion, and a detailed environment would only compete with it for
 * attention on a small screen.
 *
 * ## Why all four verbs live in the world
 *
 * PET is a hold on the creature's body and STAMP is a tap on the totem; both
 * were confirmed working on a real phone. FEED and TEACH used to be two
 * screen-space buttons in a bottom thumb arc, and on a device that arc landed
 * directly on top of the Decentraland client's OWN controls — the movement
 * joystick, the jump button and the emote buttons to its left and right.
 * Pressing jump pressed TEACH, which writes a permanent row to an append-only
 * chain with no delete verb.
 *
 * Decentraland documents that scene UI "will clash with the system controls"
 * but does not publish where those controls sit, and two attempts to dodge them
 * by guessing at percentages both failed. So the collision is removed
 * structurally rather than tuned: FEED is the bowl and TEACH is the stage, and
 * there is no scene-owned furniture on the bottom of the screen at all.
 *
 * ## How a first-time visitor knows what they are
 *
 * There is no tutorial and no instruction text — the organizers require the
 * scene to be self-evident to someone who never reads the README. `hoverText`
 * cannot carry that load either, because a phone has no hover. So each verb is
 * signalled four independent ways:
 *
 *   1. **Placement.** Both sit on the line from the spawn point to the
 *      creature, one either side, so you walk between them to reach Mochi.
 *   2. **A floating label**, billboarded to face you — the same idiom the
 *      scene already uses for dancer name-tags and the plaque.
 *   3. **Shape and colour.** The bowl is full of the same glowing berries that
 *      grow on the bush, so it reads as food before the word is read. The
 *      stage is a pale plinth: the shape of somewhere you stand to be watched.
 *   4. **`hoverText`**, for the desktop client where hover exists.
 */

import {
  engine,
  Transform,
  MeshRenderer,
  MeshCollider,
  ColliderLayer,
  Material,
  TextShape,
  Billboard,
  PointerEvents,
  PointerEventType,
  InputAction,
  Entity
} from '@dcl/sdk/ecs'
import { Vector3, Quaternion, Color4, Color3 } from '@dcl/sdk/math'
import { PALETTE } from '../config'

export type Meadow = {
  bush: Entity
  plaque: Entity
  totem: Entity
  /** FEED. A tap on the bowl in front of the creature. */
  bowl: Entity
  /** TEACH. A tap on the plinth, which opens the emote picker. */
  stage: Entity
}

/**
 * How far a tap reaches, in metres.
 *
 * The same figure for every prop in the clearing. Spawn is z 2–3 and the props
 * sit at z 5.8, so this is deliberately generous enough that a visitor can act
 * from where they first stop walking rather than having to find an exact spot.
 */
const REACH = 6

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

/**
 * A word floating over a prop, facing whoever is looking at it.
 *
 * The scene's substitute for a button label, and its substitute for a
 * tutorial. Billboarded so it reads from any approach, outlined in white so it
 * survives being drawn over pale grass on a small screen, and set larger than
 * the dancer name-tags because these two are the only words a visitor has to
 * notice in order to play at all.
 *
 * One word each. A sentence here would be instruction text, which this scene
 * does not have anywhere.
 */
function label(text: string, position: Vector3): Entity {
  const e = engine.addEntity()
  Transform.create(e, { position })
  TextShape.create(e, {
    text,
    fontSize: 1.7,
    textColor: Color4.fromHexString('#4A3B52ff'),
    outlineWidth: 0.14,
    outlineColor: Color3.fromHexString('#FFFFFFff')
  })
  Billboard.create(e)
  return e
}

/**
 * The berry bush — where the food in the bowl comes from.
 *
 * Not interactive, and deliberately so: it is the visual premise that makes the
 * bowl legible as food without a caption. Feeding happens at the bowl.
 */
function bush(): Entity {
  const e = engine.addEntity()
  MeshRenderer.setSphere(e)
  // No collider. Nothing taps it and nothing should walk into it — see the
  // note on REACH about props that can only cost a visitor movement.
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
  // No collider: it is a surface to read, not a thing to touch or bump.
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
  MeshCollider.setCylinder(e, 0.28, 0.34, ColliderLayer.CL_POINTER)
  Transform.create(e, {
    position: Vector3.create(10.2, 0.55, 10.4),
    scale: Vector3.create(1, 1.1, 1)
  })
  Material.setPbrMaterial(e, { albedoColor: PALETTE.bodyLight, roughness: 0.9 })
  PointerEvents.create(e, {
    pointerEvents: [
      {
        eventType: PointerEventType.PET_DOWN,
        eventInfo: { button: InputAction.IA_POINTER, hoverText: 'sign the guestbook', maxDistance: REACH }
      }
    ]
  })
  return e
}

/**
 * The food bowl — FEED.
 *
 * A tapered cylinder, wider at the rim, filled to the brim with the bush's
 * berries. Two primitives, both reusing material definitions the scene already
 * pays for: the bowl is the totem's pale body tone, the berries are the same
 * emissive accent as the ones on the bush.
 *
 * The berries stop level with the rim rather than heaping above it, so the
 * bowl's own cylinder collider is what every tap lands on. A mound standing
 * proud of the rim would take the tap ray first and, having no collider of its
 * own, swallow it.
 *
 * Placed just left of the walking line from spawn to the creature and about
 * 2.5 m out from it — inside `REACH` from the spawn point itself, so a visitor
 * who never takes a step can still feed, and only 0.3 m tall, so it can never
 * stand in front of the thing it feeds.
 */
function bowl(): Entity {
  const at = Vector3.create(6.9, 0, 5.8)

  const e = engine.addEntity()
  MeshRenderer.setCylinder(e, 0.42, 0.3)
  MeshCollider.setCylinder(e, 0.42, 0.3, ColliderLayer.CL_POINTER)
  Transform.create(e, {
    position: Vector3.create(at.x, 0.15, at.z),
    scale: Vector3.create(1, 0.3, 1)
  })
  Material.setPbrMaterial(e, { albedoColor: PALETTE.bodyLight, roughness: 0.9 })
  PointerEvents.create(e, {
    pointerEvents: [
      {
        eventType: PointerEventType.PET_DOWN,
        eventInfo: { button: InputAction.IA_POINTER, hoverText: 'feed Mochi', maxDistance: REACH }
      }
    ]
  })

  const berries = engine.addEntity()
  MeshRenderer.setSphere(berries)
  Transform.create(berries, {
    position: Vector3.create(at.x, 0.22, at.z),
    scale: Vector3.create(0.62, 0.18, 0.62)
  })
  Material.setPbrMaterial(berries, {
    albedoColor: PALETTE.accent,
    emissiveColor: { r: PALETTE.accent.r, g: PALETTE.accent.g, b: PALETTE.accent.b },
    emissiveIntensity: 0.3
  })

  label('feed', Vector3.create(at.x, 0.82, at.z))
  return e
}

/**
 * The stage — TEACH.
 *
 * A plinth: one tapered cylinder, wider at the base, in the plaque's cream so
 * it reads as a made thing rather than as ground. Its collider is the default
 * physics-and-pointer pair, so a visitor can actually step up onto it — which
 * is most of what tells them it is a place to perform.
 *
 * Mirrors the bowl across the walking line, at the same distance, so the two
 * verbs present as a pair rather than as one prop and one accident.
 */
function stage(): Entity {
  const at = Vector3.create(9.1, 0, 5.8)

  const e = engine.addEntity()
  MeshRenderer.setCylinder(e, 0.46, 0.62)
  MeshCollider.setCylinder(e, 0.46, 0.62, ColliderLayer.CL_POINTER)
  Transform.create(e, {
    position: Vector3.create(at.x, 0.11, at.z),
    scale: Vector3.create(1, 0.22, 1)
  })
  Material.setPbrMaterial(e, { albedoColor: PALETTE.sky, roughness: 0.9 })
  PointerEvents.create(e, {
    pointerEvents: [
      {
        eventType: PointerEventType.PET_DOWN,
        eventInfo: { button: InputAction.IA_POINTER, hoverText: 'teach Mochi a move', maxDistance: REACH }
      }
    ]
  })

  label('teach', Vector3.create(at.x, 0.82, at.z))
  return e
}

export function createMeadow(): Meadow {
  ground()
  backdrop()
  return { bush: bush(), plaque: plaque(), totem: totem(), bowl: bowl(), stage: stage() }
}
