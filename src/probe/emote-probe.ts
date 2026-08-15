/**
 * CHECK 2 — does the mobile client report avatar emotes to the scene?
 *
 * This is the probe that matters. The TEACH mechanic (perform an emote, Mochi
 * appends it to a communal dance chain credited to you) is only possible if the
 * explorer writes AvatarEmoteCommand while running on a phone.
 *
 * Why the docs do not settle this: the SDK docs carry a note reading "This
 * feature is only supported in the Desktop client", but it sits inside the
 * "Detect when an emote finishes" section, so on its face it scopes to the
 * EmoteState lifecycle rather than to basic emote detection. AvatarEmoteCommand
 * is not listed on the mobile missing-features page at all. No page states
 * outright that basic detection works on mobile. Hence: measure it on a device.
 *
 * API shape, verified against the @dcl/ecs type definitions:
 * AvatarEmoteCommand is a GrowOnlyValueSet, not a last-write-wins component.
 * The explorer APPENDS an entry to a per-entity set, on every player entity in
 * the scene — the local player and remote avatars alike. Entries carry a
 * monotonic `timestamp` and the set is kept sorted by it. `onChange` is
 * inherited from BaseComponent and does apply here.
 *
 * Both detection paths are instrumented, because they can fail independently:
 * data arriving while onChange stays silent is a different diagnosis from no
 * data at all, and only one of those kills the mechanic.
 */

import { engine, AvatarEmoteCommand, PlayerIdentityData, EmoteState, Entity } from '@dcl/sdk/ecs'
import { probe } from './state'

/** Highest emote timestamp already counted, per player entity. */
const seenUpTo = new Map<Entity, number>()
/** Entities already wired to an onChange callback. */
const hooked = new Set<Entity>()

function stateLabel(state: EmoteState | undefined): string {
  switch (state) {
    case EmoteState.ES_FINISHED:
      return 'finished'
    case EmoteState.ES_INTERRUPTED:
      return 'interrupted'
    // Absent means "started" — older explorers omit the field entirely.
    default:
      return 'started'
  }
}

function describe(entity: Entity): string {
  if (entity === engine.PlayerEntity) return 'self'
  return PlayerIdentityData.getOrNull(entity)?.address ?? `entity ${entity}`
}

function record(entity: Entity, urn: string, state: EmoteState | undefined) {
  probe.lastEmoteUrn = urn
  probe.lastEmoteState = stateLabel(state)
  probe.lastEmoteFromSelf = entity === engine.PlayerEntity
}

/**
 * Registers the idiomatic onChange path for an entity, once.
 *
 * Player entities appear as avatars load, so this cannot be wired a single time
 * at startup — it is called from the polling system as entities are discovered.
 */
function hookOnChange(entity: Entity) {
  if (hooked.has(entity)) return
  hooked.add(entity)

  AvatarEmoteCommand.onChange(entity, (value) => {
    if (!value) return
    probe.onChangeCount++
    record(entity, value.emoteUrn, value.state)
    console.log(`[probe] onChange fired: "${value.emoteUrn}" from ${describe(entity)}`)
  })
}

export function emoteProbeSystem() {
  for (const [entity] of engine.getEntitiesWith(AvatarEmoteCommand)) {
    hookOnChange(entity)

    // Returns an empty frozen set when the entity has no entries, never throws.
    const emotes = AvatarEmoteCommand.get(entity)
    if (emotes.size === 0) continue

    const previous = seenUpTo.get(entity) ?? -Infinity
    let highest = previous

    for (const emote of emotes) {
      if (emote.timestamp <= previous) continue

      probe.pollCount++
      record(entity, emote.emoteUrn, emote.state)

      // Logged as well as shown: the terminal running the mobile preview keeps a
      // record even when the phone screen is being read in a hurry.
      console.log(`[probe] polled "${emote.emoteUrn}" (${stateLabel(emote.state)}) from ${describe(entity)}`)

      if (emote.timestamp > highest) highest = emote.timestamp
    }

    seenUpTo.set(entity, highest)
  }
}
