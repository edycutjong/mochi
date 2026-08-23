/**
 * The ring of memory dancers, under a real engine.
 *
 * This file exists because of a defect that no amount of reading caught. The
 * server broadcasts the whole world after every successful mutation — a pet
 * included, and a wallet may pet ten times a minute. `src/index.ts` renders
 * every one of those broadcasts, and `setDancers` used to open with
 * `clearDancers()`, so one visitor tapping the creature destroyed and
 * recreated up to six `AvatarShape` entities in everybody else's clearing, ten
 * times a minute, each. Avatar instantiation is the most expensive thing the
 * mobile client does.
 *
 * Every assertion below is about entity identity, taken from the same
 * `@dcl/ecs` engine the scene runs on. An entity id that changed is an entity
 * that was destroyed and rebuilt — there is no cheaper way for it to change —
 * so "the ring was left alone" is a fact about the engine here and not a claim
 * about the code.
 */

import { beforeEach, describe, expect, test } from 'vitest'
import { engine, AvatarShape, TextShape, Entity } from '@dcl/sdk/ecs'

import { setDancers, clearDancers, setFidelity, type ChainEntry } from '../src/mochi/dancers'

/** One chain entry per name. Same move, same clothes — only the person differs. */
function chain(...names: string[]): ChainEntry[] {
  return names.map((teacherName) => ({ emoteId: 'wave', teacherName, wearables: ['urn:test:hat'] }))
}

/** The avatar entities currently standing in the meadow. */
function avatars(): Entity[] {
  return [...engine.getEntitiesWith(AvatarShape)].map(([entity]) => entity)
}

function nameTags(): Entity[] {
  return [...engine.getEntitiesWith(TextShape)].map(([entity]) => entity)
}

beforeEach(() => {
  clearDancers()
  setFidelity('avatars-6')
})

describe('the ring is left alone when nothing about it changed', () => {
  test('an identical chain, freshly parsed, does not rebuild a single dancer', () => {
    setDancers(chain('Kito', 'Rue', 'Ada'))
    const before = avatars()
    expect(before).toHaveLength(3)

    // The point of the test. Every broadcast arrives as new objects off
    // JSON.parse, so an identity comparison would rebuild every time; this is
    // an equal chain that shares no object with the one above.
    setDancers(chain('Kito', 'Rue', 'Ada'))

    expect(avatars()).toEqual(before)
  })

  test('ten pets in a row cost nothing — that is the defect this file is here for', () => {
    setDancers(chain('Kito', 'Rue', 'Ada'))
    const before = avatars()

    // A wallet's whole per-minute pet allowance. Each one broadcasts the full
    // world back to every connection, chain and all.
    for (let pet = 0; pet < 10; pet++) setDancers(chain('Kito', 'Rue', 'Ada'))

    expect(avatars()).toEqual(before)
  })

  test('a move outside the visible window does not disturb the visible ones', () => {
    // The ring draws the last six. The seventh-from-last is real history and
    // is not on screen, so changing it must not cost an avatar rebuild.
    const older = chain('Zed', 'A', 'B', 'C', 'D', 'E', 'F')
    setDancers(older)
    const before = avatars()
    expect(before).toHaveLength(6)

    setDancers(chain('Yan', 'A', 'B', 'C', 'D', 'E', 'F'))

    expect(avatars()).toEqual(before)
  })
})

describe('the ring is rebuilt when it genuinely differs', () => {
  test('a taught move appends a dancer', () => {
    setDancers(chain('Kito', 'Rue'))
    const before = avatars()

    setDancers(chain('Kito', 'Rue', 'Ada'))

    const after = avatars()
    expect(after).toHaveLength(3)
    expect(after).not.toEqual(before)
  })

  test('the same people in a different order is a different chain', () => {
    setDancers(chain('Kito', 'Rue', 'Ada'))
    const before = avatars()

    setDancers(chain('Ada', 'Rue', 'Kito'))

    expect(avatars()).not.toEqual(before)
  })

  test('the same move by a different person is a different chain', () => {
    setDancers(chain('Kito'))
    const before = avatars()

    setDancers(chain('Rue'))

    expect(avatars()).not.toEqual(before)
  })

  test('a change of wearables redresses the dancer', () => {
    setDancers([{ emoteId: 'wave', teacherName: 'Kito', wearables: ['urn:test:hat'] }])
    const before = avatars()

    setDancers([{ emoteId: 'wave', teacherName: 'Kito', wearables: ['urn:test:boots'] }])

    expect(avatars()).not.toEqual(before)
  })

  test('a change of move by the same person is a different chain', () => {
    setDancers([{ emoteId: 'wave', teacherName: 'Kito', wearables: [] }])
    const before = avatars()

    setDancers([{ emoteId: 'dab', teacherName: 'Kito', wearables: [] }])

    expect(avatars()).not.toEqual(before)
  })
})

describe('the fidelity ladder still redraws', () => {
  test('dropping to three avatars redraws the same chain at the lower rung', () => {
    setDancers(chain('A', 'B', 'C', 'D', 'E', 'F'))
    expect(avatars()).toHaveLength(6)

    setFidelity('avatars-3')
    setDancers(chain('A', 'B', 'C', 'D', 'E', 'F'))

    expect(avatars()).toHaveLength(3)
  })

  test('the bottom rung replaces avatars with name tags', () => {
    setDancers(chain('A', 'B', 'C'))
    expect(avatars()).toHaveLength(3)

    setFidelity('nametags')
    setDancers(chain('A', 'B', 'C'))

    expect(avatars()).toHaveLength(0)
    expect(nameTags()).toHaveLength(3)
  })

  test('an empty chain empties the ring', () => {
    setDancers(chain('A', 'B'))
    setDancers([])
    expect(avatars()).toHaveLength(0)
  })
})

describe('the cost of a busy minute', () => {
  test('a minute in a crowded clearing builds one ring per taught move and nothing else', () => {
    // A plausible minute: six moves already in the chain, twenty broadcasts,
    // eighteen of which are feeds, pets and stamps that leave the chain
    // exactly where it was, and two of which are somebody teaching.
    const names = ['A', 'B', 'C', 'D', 'E', 'F']
    const ever = new Set<Entity>()
    const broadcast = (): void => {
      setDancers(chain(...names))
      for (const entity of avatars()) ever.add(entity)
    }

    broadcast()
    for (let i = 0; i < 9; i++) broadcast()
    names.push('G')
    broadcast()
    for (let i = 0; i < 8; i++) broadcast()
    names.push('H')
    broadcast()

    // Three rings were ever built: the one we arrived to, and one per teach.
    // Remove the guard in `setDancers` and this is 20 × 6 = 120 — every one of
    // them an `AvatarShape` torn down and instantiated again.
    expect(ever.size).toBe(18)
  })
})

describe('clearing forgets', () => {
  test('the same chain is drawn again after the ring has been torn down', () => {
    setDancers(chain('Kito', 'Rue'))
    clearDancers()
    expect(avatars()).toHaveLength(0)

    setDancers(chain('Kito', 'Rue'))

    expect(avatars()).toHaveLength(2)
  })
})

describe('the ring counts people, not moves', () => {
  /** Same person, several moves — what a solo visitor's chain actually is. */
  function movesBy(teacherName: string, ...emoteIds: string[]): ChainEntry[] {
    return emoteIds.map((emoteId) => ({ teacherName, emoteId, wearables: ['urn:test:hat'] }))
  }

  test('one person who taught six moves is one ghost, not six copies of them', () => {
    // Reported from a real phone: a solo visitor saw six identical clones of
    // themselves. The ring is the scene's visual claim about how many people
    // have tended the creature, so drawing one person six times asserts
    // something untrue — and this project's whole premise is that every
    // visible property was produced by somebody else.
    setDancers(movesBy('Edy', 'wave', 'clap', 'dab', 'kiss', 'shrug', 'disco'))

    expect(avatars()).toHaveLength(1)
    expect(nameTags().length).toBeGreaterThanOrEqual(1)
  })

  test('six different people are still six ghosts', () => {
    setDancers(chain('Kito', 'Rue', 'Ada', 'Nim', 'Oro', 'Vex'))
    expect(avatars()).toHaveLength(6)
  })

  test('a person is drawn once however many times they appear in the chain', () => {
    setDancers([
      ...movesBy('Kito', 'wave', 'clap'),
      ...movesBy('Rue', 'dab'),
      ...movesBy('Kito', 'kiss')
    ])
    expect(avatars()).toHaveLength(2)
  })

  test('teaching again moves you to the end of the ring, not back to where you were', () => {
    // Order is who-contributed-most-recently. Keeping a re-teacher at their
    // first-seen position would make the ring read as arrival order instead.
    setDancers([...movesBy('Kito', 'wave'), ...movesBy('Rue', 'clap')])
    const twoPeople = avatars()
    expect(twoPeople).toHaveLength(2)

    setDancers([...movesBy('Kito', 'wave'), ...movesBy('Rue', 'clap'), ...movesBy('Kito', 'dab')])

    // Still two people, but the ring changed, so it must have been rebuilt.
    expect(avatars()).toHaveLength(2)
    expect(avatars()).not.toEqual(twoPeople)
  })
})
