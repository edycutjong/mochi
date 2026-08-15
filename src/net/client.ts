/**
 * The scene's connection to the authoritative server.
 *
 * The client owns no state. It sends intents and renders whatever the server
 * last said, which is why this file is small: there is no merge logic, no
 * client-side prediction of the creature's size, and no second source of truth
 * to reconcile.
 *
 * ## Never a blank Mochi
 *
 * The one behaviour worth stating plainly, because it is the difference
 * between a bad minute and a ruined visit: **losing the connection never
 * clears what is on screen.** The last state the server sent stays rendered,
 * local animation keeps playing, and intents queue until the socket returns.
 *
 * A visitor who arrives during a server hiccup sees a creature with a history,
 * slightly stale. A visitor who arrives to a client that blanked on
 * disconnect sees an empty field, which is precisely the emptiness this whole
 * project exists to answer.
 *
 * ## Guests
 *
 * A guest connects, receives state, and renders everything. The server marks
 * the session read-only and refuses its writes. Watching is not a degraded
 * mode — most of what there is to receive here is other people's history, and
 * none of that requires a wallet.
 */

import type {
  ClientMessage,
  ServerMessage,
  StateMessage,
  AwayLine,
  SessionInfo,
  ErrorCode
} from '../../server/src/protocol'

export type NetEvents = {
  /** Fired on every state the server sends, including the hello reply. */
  onState: (state: StateMessage) => void
  /** Fired once per connection, only when the server has a line to offer. */
  onAwayLine: (line: AwayLine) => void
  /** Fired when a message is refused. */
  onRefused: (code: ErrorCode, message: string) => void
  /** Connection came up or went down — drives nothing but the status dot. */
  onLink: (up: boolean) => void
}

export type Identity = { wallet: string; name: string; isGuest: boolean }

const RECONNECT_MIN_MS = 1000
const RECONNECT_MAX_MS = 20000
/** Cap on queued intents. A visitor cannot bank a hundred feedings offline. */
const QUEUE_LIMIT = 8

let socket: WebSocket | null = null
let identity: Identity | null = null
let events: NetEvents | null = null
let url = ''

let queue: ClientMessage[] = []
let backoff = RECONNECT_MIN_MS
let session: SessionInfo | null = null
/** The last state the server sent. Survives disconnection deliberately. */
let lastState: StateMessage | null = null
let closedByUs = false

export function currentState(): StateMessage | null {
  return lastState
}

export function canWrite(): boolean {
  return session?.canWrite === true
}

export function isLinked(): boolean {
  return socket !== null && socket.readyState === WebSocket.OPEN
}

function flush() {
  if (!isLinked()) return
  const pending = queue
  queue = []
  for (const message of pending) socket!.send(JSON.stringify(message))
}

/**
 * Sends an intent, or queues it if the link is down.
 *
 * Queued intents are replayed on reconnect rather than dropped, so a feeding
 * that happened during a five-second outage still counts. The queue is capped:
 * beyond that the oldest are discarded, because replaying a long backlog would
 * make the creature lurch through minutes of history at once.
 */
export function send(message: ClientMessage) {
  if (isLinked()) {
    socket!.send(JSON.stringify(message))
    return
  }
  queue.push(message)
  if (queue.length > QUEUE_LIMIT) queue.shift()
}

function handle(raw: string) {
  let parsed: ServerMessage
  try {
    parsed = JSON.parse(raw) as ServerMessage
  } catch {
    return
  }

  if (parsed.t === 'error') {
    events?.onRefused(parsed.code, parsed.message)
    return
  }

  if (parsed.t !== 'state') return

  lastState = parsed
  if (parsed.you) session = parsed.you
  events?.onState(parsed)

  // Only ever present on the hello reply, and only when someone actually came
  // after this visitor's last act.
  if (parsed.awayLine) events?.onAwayLine(parsed.awayLine)
}

function open() {
  if (!identity) return

  socket = new WebSocket(url)

  socket.onopen = () => {
    backoff = RECONNECT_MIN_MS
    events?.onLink(true)
    socket!.send(
      JSON.stringify({
        t: 'hello',
        wallet: identity!.wallet,
        name: identity!.name,
        isGuest: identity!.isGuest
      } satisfies ClientMessage)
    )
    flush()
  }

  socket.onmessage = (ev) => {
    if (typeof ev.data === 'string') handle(ev.data)
  }

  socket.onerror = () => {
    // `onclose` always follows, and that is where reconnection is handled.
    // Nothing useful can be done here that is not done there.
  }

  socket.onclose = () => {
    socket = null
    session = null
    events?.onLink(false)
    if (closedByUs) return

    // Exponential backoff so a server that is down for an hour is not being
    // hammered once a second by every phone in the world.
    const wait = backoff
    backoff = Math.min(backoff * 2, RECONNECT_MAX_MS)
    setTimeout(open, wait)
  }
}

export function connect(serverUrl: string, who: Identity, handlers: NetEvents) {
  url = serverUrl
  identity = who
  events = handlers
  closedByUs = false
  open()
}

export function disconnect() {
  closedByUs = true
  socket?.close()
  socket = null
}
