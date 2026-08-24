/**
 * The watchdog that drops the ring down a rung when frames are being missed.
 *
 * This file exists because the ladder it drives was dead code. `dancers.ts`
 * could draw six avatars, three, or name-tags, `setFidelity` was exported and
 * covered by tests — and nothing in `src` ever called it. README and
 * ARCHITECTURE both told judges that a slow device gets a plainer clearing,
 * which meant the documentation described a behaviour the scene did not have.
 *
 * The assertions below are about the rung actually in force and the entities
 * actually standing in the meadow, read from the same `@dcl/ecs` engine the
 * scene runs on — not about whether the watchdog was called.
 */

import { beforeEach, describe, expect, test } from 'vitest'
import { engine, AvatarShape, TextShape, Entity } from '@dcl/sdk/ecs'

import { setDancers, clearDancers, setFidelity, getFidelity, type ChainEntry } from '../src/mochi/dancers'
import { fidelityWatchdogSystem, resetFidelityWatchdog } from '../src/mochi/fidelity-watchdog'

function chain(...names: string[]): ChainEntry[] {
  return names.map((teacherName) => ({ emoteId: 'wave', teacherName, wearables: ['urn:test:hat'] }))
}

function avatars(): Entity[] {
  return [...engine.getEntitiesWith(AvatarShape)].map(([entity]) => entity)
}

function nameTags(): Entity[] {
  return [...engine.getEntitiesWith(TextShape)].map(([entity]) => entity)
}

/** A full six-person clearing — the most expensive ring the scene can draw. */
const CROWD = chain('Kito', 'Rue', 'Ada', 'Mio', 'Sol', 'Wren')

/** Frame times either side of the 30 fps budget the watchdog defends. */
const HEALTHY_DT = 1 / 60
const STRUGGLING_DT = 1 / 15

/** Run the watchdog for `seconds` of wall clock at a fixed frame time. */
function run(seconds: number, dt: number) {
  const frames = Math.ceil(seconds / dt)
  for (let i = 0; i < frames; i++) fidelityWatchdogSystem(dt)
}

/**
 * Long enough to drop exactly one rung: 8s warm-up plus a 5s sustain window,
 * then inside the 4s settle that follows. Running longer drops a second rung,
 * which is correct behaviour and the wrong thing to assert against here.
 */
const ONE_DROP_SECONDS = 15

/** Long enough to fall all the way: two drops plus both settle periods. */
const BOTH_DROPS_SECONDS = 40

beforeEach(() => {
  clearDancers()
  setFidelity('avatars-6')
  resetFidelityWatchdog()
})

describe('a phone that is coping is left alone', () => {
  test('sustained healthy frames never drop a rung', () => {
    setDancers(CROWD)
    const before = avatars()
    expect(before).toHaveLength(6)

    run(120, HEALTHY_DT)

    expect(getFidelity()).toBe('avatars-6')
    // Identity, not count: an entity id that changed was destroyed and rebuilt.
    expect(avatars()).toEqual(before)
  })

  test('one expensive frame is forgotten rather than punished', () => {
    setDancers(CROWD)
    run(30, HEALTHY_DT)

    // Teaching a move rebuilds the ring and costs a visible frame. Half a
    // second in a single frame is far worse than anything the scene does, and
    // it still must not permanently degrade a phone that is otherwise fine.
    fidelityWatchdogSystem(0.5)
    run(30, HEALTHY_DT)

    expect(getFidelity()).toBe('avatars-6')
    expect(avatars()).toHaveLength(6)
  })

  test('a struggling stretch shorter than the sustain window is ignored', () => {
    setDancers(CROWD)
    run(30, HEALTHY_DT)
    run(2, STRUGGLING_DT)

    expect(getFidelity()).toBe('avatars-6')
  })
})

describe('a phone that is struggling gets a plainer clearing', () => {
  test('sustained missed frames drop six avatars to three', () => {
    setDancers(CROWD)
    expect(avatars()).toHaveLength(6)

    run(ONE_DROP_SECONDS, STRUGGLING_DT)

    expect(getFidelity()).toBe('avatars-3')
    expect(avatars()).toHaveLength(3)
  })

  test('the rung change redraws immediately, without waiting for a broadcast', () => {
    setDancers(CROWD)
    run(ONE_DROP_SECONDS, STRUGGLING_DT)

    // The regression this guards: `setFidelity` used only to invalidate the
    // cached signature, so the cheaper ring appeared at the next server
    // broadcast. A quiet clearing can go minutes without one, and the visitor
    // who needed the relief is the one who would never see it.
    expect(avatars()).toHaveLength(3)
  })

  test('still struggling at three avatars falls through to name-tags', () => {
    setDancers(CROWD)
    run(BOTH_DROPS_SECONDS, STRUGGLING_DT)

    expect(getFidelity()).toBe('nametags')
    expect(avatars()).toHaveLength(0)
    expect(nameTags().length).toBeGreaterThan(0)
  })

  test('the bottom rung is the bottom — it never degrades past name-tags', () => {
    setDancers(CROWD)
    run(600, STRUGGLING_DT)

    expect(getFidelity()).toBe('nametags')
    expect(nameTags().length).toBeGreaterThan(0)
  })

  test('every person in the chain survives the fall to name-tags', () => {
    setDancers(CROWD)
    run(BOTH_DROPS_SECONDS, STRUGGLING_DT)

    // The claim the ladder rests on: fidelity is what degrades, never the
    // credit. Six people went in, six names are standing there.
    expect(nameTags()).toHaveLength(6)
  })
})

describe('the ladder only ever goes down', () => {
  test('frames recovering after a drop does not climb back up', () => {
    setDancers(CROWD)
    run(ONE_DROP_SECONDS, STRUGGLING_DT)
    expect(getFidelity()).toBe('avatars-3')

    const afterDrop = avatars()
    run(300, HEALTHY_DT)

    // Climbing back would thrash: every rung change rebuilds every dancer, so
    // a phone sitting near the threshold would pay that cost repeatedly and
    // look broken while it did.
    expect(getFidelity()).toBe('avatars-3')
    expect(avatars()).toEqual(afterDrop)
  })
})

describe('the opening seconds are not evidence', () => {
  test('bad frames during warm-up do not drop a rung', () => {
    setDancers(CROWD)

    // Scene load, wearable fetches and avatar instantiation all land here.
    // None of them describe the steady state the visitor will actually play in.
    run(7, STRUGGLING_DT)

    expect(getFidelity()).toBe('avatars-6')
  })
})
