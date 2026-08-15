/**
 * TEACH — a visitor's move is appended to one shared, credited dance.
 *
 * ## Two paths, and why the mechanic survives either way
 *
 * The original design assumed one route: the visitor performs an emote with
 * the client's own emote wheel, the scene observes it via `AvatarEmoteCommand`,
 * and appends it to the chain. That route depends on the mobile client
 * reporting emotes to scenes, which the documentation does not settle — see
 * `docs/PROBE.md` check 2.
 *
 * There is a second route that depends on none of that. An in-scene picker
 * calls `triggerEmote`, which makes the player's own avatar perform the emote.
 * The scene chose the emote, so it already knows its id — nothing needs to be
 * observed at all.
 *
 * That reframes the risk considerably. If observation does not work on mobile,
 * what is lost is not TEACH; it is only the *spontaneity* of catching a move
 * the visitor started on their own. The chain, the credit and the replay all
 * survive on the picker path.
 *
 * Both are wired here. The picker is the reliable spine; observation runs
 * alongside and contributes whenever the client does report a move, so a
 * visitor who uses the native wheel out of habit is still credited.
 */

import {
  engine,
  AvatarEmoteCommand,
  AvatarBase,
  AvatarEquippedData,
  PlayerIdentityData,
  Entity
} from '@dcl/sdk/ecs'

/** A move taught by a named person. `wearables` dresses their memory dancer. */
export type TaughtMove = {
  emoteId: string
  teacherId: string
  teacherName: string
  /** What the teacher was wearing, so their memory dancer is dressed as them. */
  wearables: string[]
  source: 'picker' | 'observed'
}

type Listener = (move: TaughtMove) => void

const listeners: Listener[] = []

/** Highest emote timestamp already accounted for, per player entity. */
const seenUpTo = new Map<Entity, number>()

/** True once the client has been observed reporting at least one emote. */
let observationWorks = false

export function onTaught(cb: Listener) {
  listeners.push(cb)
}

function emit(move: TaughtMove) {
  for (const cb of listeners) cb(move)
}

/**
 * Identity for the local player.
 *
 * Returns null for guests. A guest has no durable wallet, so a move credited
 * to one would name someone who cannot be returned to — and the chain's whole
 * claim is that every move carries a name that means a person. The server
 * enforces this too; this is the client half of the same rule.
 */
export function localIdentity(): { id: string; name: string; wearables: string[] } | null {
  const identity = PlayerIdentityData.getOrNull(engine.PlayerEntity)
  if (!identity || identity.isGuest) return null

  const name = AvatarBase.getOrNull(engine.PlayerEntity)?.name
  if (!name) return null

  // Captured at the moment of teaching, not at replay: the dancer should wear
  // what that person wore when they were here, even if they change later.
  const wearables = AvatarEquippedData.getOrNull(engine.PlayerEntity)?.wearableUrns ?? []

  return { id: identity.address, name, wearables: [...wearables] }
}

/** Whether the client has ever reported an emote to this scene. */
export function isObservationWorking(): boolean {
  return observationWorks
}

/**
 * Watches for emotes the visitor performs themselves.
 *
 * `AvatarEmoteCommand` is a grow-only value set: the client APPENDS an entry
 * per player entity, sorted by a monotonic timestamp. Only the local player is
 * read here — a remote visitor's emote is their own act to contribute from
 * their own client, not something this one should credit on their behalf.
 */
export function emoteObserverSystem() {
  const player = engine.PlayerEntity
  const emotes = AvatarEmoteCommand.get(player)
  if (emotes.size === 0) return

  const previous = seenUpTo.get(player) ?? -Infinity
  let highest = previous

  for (const emote of emotes) {
    if (emote.timestamp <= previous) continue
    if (emote.timestamp > highest) highest = emote.timestamp

    observationWorks = true

    // A move triggered BY the picker also lands here. `pickerExpecting` marks
    // that case so the same act is not appended to the chain twice.
    if (pickerExpecting === emote.emoteUrn) {
      pickerExpecting = null
      continue
    }

    const who = localIdentity()
    if (!who) continue

    emit({
      emoteId: emote.emoteUrn,
      teacherId: who.id,
      teacherName: who.name,
      wearables: who.wearables,
      source: 'observed'
    })
  }

  seenUpTo.set(player, highest)
}

/**
 * Set while a picker-triggered emote is in flight, so the observer can ignore
 * the echo rather than crediting the same move twice.
 */
let pickerExpecting: string | null = null

/**
 * Teaches a move chosen from the in-scene picker.
 *
 * `triggerEmote` is a restricted action — it makes the player's own avatar
 * perform the emote, which is why `ALLOW_TO_TRIGGER_AVATAR_EMOTE` is declared
 * in scene.json. The visitor sees themselves do the move, which is most of the
 * feeling the native-wheel route would have given.
 */
export async function teachFromPicker(emoteId: string) {
  const who = localIdentity()
  if (!who) return

  pickerExpecting = emoteId
  emit({ emoteId, teacherId: who.id, teacherName: who.name, wearables: who.wearables, source: 'picker' })

  try {
    const { triggerEmote } = await import('~system/RestrictedActions')
    await triggerEmote({ predefinedEmote: emoteId })
  } catch {
    // The move is already recorded and credited; only the visitor's own avatar
    // failed to perform it. Degrading quietly is correct here — the chain is
    // the product, the mirror is the flourish.
    pickerExpecting = null
  }
}
