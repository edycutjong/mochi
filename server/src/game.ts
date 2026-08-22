/**
 * The room: all of the game rules, and none of the networking.
 *
 * A `Room` owns the connected sessions and decides what each incoming message
 * is allowed to do. It talks to the outside world only through the `Sink`
 * interface below, which is why every rule in here — the guest refusal, the
 * rate limits, the away-line on arrival — is unit-testable without opening a
 * socket. `ws.ts` is the only file that knows WebSockets exist.
 */

import type { Store } from './store.js'
import type { Config } from './config.js'
import { RateLimiter } from './ratelimit.js'
import {
  parseClientMessage,
  type ClientMessage,
  type ErrorCode,
  type MutatingKind,
  type ServerMessage,
  type StateMessage
} from './protocol.js'

/** Anything that can receive server messages. A WebSocket, or a test array. */
export interface Sink {
  send(message: ServerMessage): void
}

export interface RoomOptions {
  /** Injectable clock. Every rule in the room reads time through this. */
  now?: () => number
}

/**
 * What the server knows about one connection.
 *
 * `wallet` and `name` are null until `hello` lands, which is what makes
 * "no writes before the handshake" a state machine rather than a check that
 * can be forgotten at a call site.
 */
export interface Session {
  wallet: string | null
  name: string | null
  isGuest: boolean
  canWrite: boolean
}

/** Returned by `Room.connect`. The transport pushes raw JSON in and closes it. */
export interface ConnectionHandle {
  readonly session: Session
  /** Feed one already-JSON-parsed message in. */
  receive(raw: unknown): void
  /** Drop the connection from the room. */
  close(): void
}

/**
 * A wallet address as Decentraland reports it.
 *
 * The identity that reaches the server is always an account address; anything
 * that is not one is a malformed or hand-rolled client, and it is refused
 * rather than written into a permanent, publicly credited log.
 */
const WALLET_PATTERN = /^0x[0-9a-fA-F]{40}$/

const MS_PER_HOUR = 3_600_000

export class Room {
  private readonly limiter: RateLimiter
  private readonly sinks = new Map<Sink, Session>()
  private readonly now: () => number

  constructor(
    private readonly store: Store,
    private readonly config: Config,
    options: RoomOptions = {}
  ) {
    this.limiter = new RateLimiter(config.limits)
    this.now = options.now ?? (() => Date.now())
  }

  get connectionCount(): number {
    return this.sinks.size
  }

  /** Register a new connection. It may do nothing until it says `hello`. */
  connect(sink: Sink): ConnectionHandle {
    const session: Session = { wallet: null, name: null, isGuest: false, canWrite: false }
    this.sinks.set(sink, session)

    return {
      session,
      receive: (raw: unknown) => this.receive(sink, session, raw),
      close: () => {
        this.sinks.delete(sink)
      }
    }
  }

  // -------------------------------------------------------------------------

  private receive(sink: Sink, session: Session, raw: unknown): void {
    const message = parseClientMessage(raw)
    if (!message) {
      this.fail(sink, 'bad_message', 'unrecognised message')
      return
    }

    if (message.t === 'hello') {
      this.onHello(sink, session, message)
      return
    }

    this.onMutation(sink, session, message)
  }

  /**
   * The handshake, and the only place the away-line is computed.
   *
   * The reply is a normal `state` message with two extra fields: who the server
   * thinks you are, and — if there is one — the single sentence about the
   * person who came after you. It is answered per connection and never
   * broadcast, because it is the one thing in the design addressed to a person
   * rather than announced to the room.
   */
  private onHello(sink: Sink, session: Session, message: Extract<ClientMessage, { t: 'hello' }>): void {
    if (session.wallet !== null) {
      this.fail(sink, 'already_hello', 'this connection has already introduced itself')
      return
    }

    if (!WALLET_PATTERN.test(message.wallet)) {
      this.fail(sink, 'bad_wallet', 'a wallet address is required')
      return
    }

    // The schema refuses a nameless chain move; refuse it a step earlier, at
    // the door, so a session can never get far enough to hit that constraint.
    if (message.name.length === 0) {
      this.fail(sink, 'name_required', 'a display name is required')
      return
    }

    session.wallet = message.wallet.toLowerCase()
    session.name = message.name
    session.isGuest = message.isGuest
    session.canWrite = !message.isGuest

    const now = this.now()
    const awayLine = this.store.awayLine(session.wallet)

    sink.send({
      ...this.buildState(now),
      awayLine,
      you: { wallet: session.wallet, name: session.name, canWrite: session.canWrite }
    })
  }

  /**
   * Everything that writes.
   *
   * Four gates in a fixed order, cheapest and most absolute first: introduced,
   * allowed to write at all, within its rate limit, then — and only then — the
   * database. A message that fails any gate leaves no trace in either log.
   */
  private onMutation(sink: Sink, session: Session, message: Exclude<ClientMessage, { t: 'hello' }>): void {
    const { wallet, name } = session
    if (wallet === null || name === null) {
      this.fail(sink, 'hello_required', 'say hello before doing anything')
      return
    }

    // Guests are welcome to watch. They are not written into the history,
    // because a name nobody owns credits nobody — and the flag arrives from the
    // client, so this has to be decided here rather than trusted there.
    if (!session.canWrite) {
      this.fail(sink, 'guest_read_only', 'sign in with a wallet to tend Mochi')
      return
    }

    const kind: MutatingKind = message.t
    const now = this.now()
    const verdict = this.limiter.check(wallet, kind, now)
    if (!verdict.allowed) {
      sink.send({
        t: 'error',
        code: 'rate_limited',
        message: `too many ${kind} messages this minute`,
        retryAt: verdict.retryAt
      })
      return
    }

    switch (message.t) {
      case 'feed':
        this.store.feed({ wallet, name, kind: 'feed', at: now })
        break
      case 'teach':
        this.store.teach({ wallet, name, at: now, emoteId: message.emoteId, wearables: message.wearables })
        break
      case 'pet':
      case 'stamp':
        this.store.logCarer({ wallet, name, kind, at: now })
        break
    }

    this.broadcast()
  }

  // -------------------------------------------------------------------------

  /** Assemble the world as it stands. Shared by the hello reply and broadcasts. */
  buildState(now: number = this.now()): StateMessage {
    const since = now - this.config.carerWindowHours * MS_PER_HOUR

    return {
      t: 'state',
      now,
      pet: this.store.readPet(now),
      chain: this.store.recentChain(this.config.chainLimit),
      carers: this.store.carersSince(since),
      chainLength: this.store.chainLength(),
      carerCount: this.store.carerCount()
    }
  }

  /** Push the new world to everyone who is here to see it. */
  broadcast(): void {
    if (this.sinks.size === 0) return
    const state = this.buildState()
    for (const sink of this.sinks.keys()) {
      try {
        sink.send(state)
      } catch {
        // A dead socket is the transport's problem to clean up. One bad
        // connection must never stop the others from being told what happened.
      }
    }
  }

  private fail(sink: Sink, code: ErrorCode, message: string): void {
    sink.send({ t: 'error', code, message })
  }
}
