/**
 * The carer plaque and the away-line.
 *
 * This is where the creature stops being a toy and starts carrying evidence of
 * other people. Everything rendered here was left by someone who is not in the
 * room: the last person to feed, the names on today's list, and the one
 * sentence that names whoever tended it after your own last visit.
 *
 * ## Directed, not broadcast
 *
 * "214 friends have cared for Mochi" is a number about a crowd. "Kito fed
 * Mochi after you left" is a sentence about one person, addressed to you. The
 * second costs a single extra query and is worth far more, so the plaque
 * always prefers a name over a count.
 *
 * ## A caution about TextShape on mobile
 *
 * There is a live platform issue where `TextShape` renders at a different
 * height on the mobile client than on desktop, and every string on this plaque
 * is a `TextShape`. Vertical placement here must be confirmed on a device and
 * never trusted from the desktop preview. `TextShape` also does not receive
 * pointer events, so the plaque's own box collider is what makes it tappable.
 */

import { engine, Transform, TextShape, Entity } from '@dcl/sdk/ecs'
import { Vector3, Color4, Color3 } from '@dcl/sdk/math'

export type PlaqueState = {
  /** Display name of the last person to feed. Empty if nobody ever has. */
  lastFedBy: string
  /** Roughly how long ago, already humanised by the caller. */
  lastFedAgo: string
  /** Names on today's carer list, most recent first. */
  todaysCarers: string[]
  /**
   * The away-line: the person whose act followed your own last one.
   * Empty when this is a first visit, or when nobody has been since.
   */
  awayLine: string
}

let headline: Entity | null = null
let roster: Entity | null = null

function text(parent: Entity, y: number, size: number): Entity {
  const e = engine.addEntity()
  Transform.create(e, { parent, position: Vector3.create(0, y, -0.06) })
  TextShape.create(e, {
    text: '',
    fontSize: size,
    textColor: Color4.fromHexString('#4A3B52ff'),
    outlineWidth: 0.08,
    outlineColor: Color3.fromHexString('#FFFFFFff')
  })
  return e
}

export function createPlaque(plaqueEntity: Entity) {
  // Parented to the plaque prop, so the board and its text can never drift
  // apart when the prop is repositioned.
  headline = text(plaqueEntity, 0.22, 1.1)
  roster = text(plaqueEntity, -0.14, 0.7)
}

/**
 * Humanises an elapsed time.
 *
 * Deliberately coarse. "3h ago" carries the feeling that someone was here and
 * has since gone; "2h 47m ago" reads like a log file and carries nothing.
 */
export function ago(msSince: number): string {
  const mins = Math.floor(msSince / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'yesterday' : `${days}d ago`
}

export function renderPlaque(state: PlaqueState) {
  if (!headline || !roster) return

  const head = TextShape.getMutable(headline)
  head.text = state.lastFedBy ? `last fed by ${state.lastFedBy}\n${state.lastFedAgo}` : 'nobody has fed Mochi yet'

  // Cap the roster: a wall of names stops reading as people and starts
  // reading as a leaderboard, which is the opposite of the intent.
  const shown = state.todaysCarers.slice(0, 5)
  const extra = state.todaysCarers.length - shown.length

  const list = TextShape.getMutable(roster)
  if (shown.length === 0) {
    list.text = ''
  } else {
    list.text = extra > 0 ? `${shown.join(' · ')}\nand ${extra} more today` : shown.join(' · ')
  }
}
