/**
 * The wire protocol between the scene and the authoritative server.
 *
 * This file is deliberately dependency-free so the Decentraland scene can
 * import it directly (`import type { ... } from '../../server/src/protocol'`)
 * and share one definition of the wire format with the server. Nothing here
 * may import from `node:` or from any package.
 *
 * Shape rules:
 *  - every message is a JSON object with a short discriminator `t`
 *  - field names are short because they go over a mobile connection
 *  - the client sends *intents*; it never sends state. The server owns state.
 */

/** Every message carries this discriminator. */
export type MessageType = ClientMessage['t'] | ServerMessage['t']

/** The mutating intents. `hello` is not one of them — it writes nothing. */
export const MUTATING_KINDS = ['feed', 'teach', 'pet', 'stamp'] as const
export type MutatingKind = (typeof MUTATING_KINDS)[number]

// ---------------------------------------------------------------------------
// Client → Server
// ---------------------------------------------------------------------------

/**
 * First message on every connection. Nothing else is accepted until it arrives.
 *
 * `isGuest` comes from the scene's `PlayerIdentityData`. It is a hint, not a
 * credential: the server treats a guest session as read-only, and it also
 * refuses sessions that cannot produce a display name, because an anonymous
 * entry in the chain is worth nothing to the person who earned it.
 */
export interface HelloMessage {
  t: 'hello'
  /** Wallet address. Normalised to lowercase by the server. */
  wallet: string
  /** Display name shown on the plaque and against each chain move. */
  name: string
  /** From `PlayerIdentityData.isGuest`. Guests may watch; they may not write. */
  isGuest: boolean
}

/** Feed the creature. Raises hunger, increments the size, credits the carer. */
export interface FeedMessage {
  t: 'feed'
}

/** Append one move to the communal dance chain, credited to this player. */
export interface TeachMessage {
  t: 'teach'
  /** Emote id as reported by `AvatarEmoteCommand`. */
  emoteId: string
  /** Wearable urns worn at the moment of teaching. Dresses the memory dancer. */
  wearables: string[]
}

/** A pet. Logged as a carer event; changes no derived state. */
export interface PetMessage {
  t: 'pet'
}

/** The guestbook stamp that closes a visit. */
export interface StampMessage {
  t: 'stamp'
}

export type ClientMessage = HelloMessage | FeedMessage | TeachMessage | PetMessage | StampMessage

// ---------------------------------------------------------------------------
// Server → Client
// ---------------------------------------------------------------------------

/** The single row of derived creature state. */
export interface PetState {
  /** 0..1. Decays towards a floor; never reaches zero. */
  hunger: number
  /** The literal sum of every feeding, ever. Size *is* this number. */
  feedCount: number
  /** Epoch ms. */
  lastFedAt: number
  /** Display name of the last person to feed. Drives the plaque. */
  lastFedBy: string
}

/** One credited move in the communal dance chain. */
export interface ChainMoveDto {
  /** Position in the chain, 1-based, stable forever. */
  seq: number
  emoteId: string
  /** Display name of the person who taught it. Never empty. */
  teacherName: string
  /** Wearable urns worn when it was taught. */
  wearables: string[]
  taughtAt: number
  /** True for rows produced during the opening community seeding drive. */
  isSeed: boolean
}

/** One entry in the carer list. */
export interface CarerDto {
  name: string
  kind: MutatingKind
  at: number
  isSeed: boolean
}

/**
 * The away-line: the named person whose act followed yours.
 *
 * Computed once, in the reply to `hello`, for that connection only. It is the
 * one thing in the protocol addressed to a single person rather than announced
 * to the room, so it never appears in a broadcast.
 */
export interface AwayLine {
  /** Their display name. */
  name: string
  /** What they did. */
  kind: MutatingKind
  /** When they did it, epoch ms. */
  at: number
}

/**
 * The whole world, as the server sees it.
 *
 * Sent once in reply to `hello` (with `awayLine` and `you` populated) and then
 * broadcast to every connection after any successful mutation (without them).
 */
export interface StateMessage {
  t: 'state'
  /** Server clock, epoch ms. The client uses this to age hunger locally. */
  now: number
  pet: PetState
  /** The last N moves of the chain, oldest first. */
  chain: ChainMoveDto[]
  /** Carer events inside the rolling window, most recent first. */
  carers: CarerDto[]
  /** Total length of the chain, which may exceed `chain.length`. */
  chainLength: number
  /** Distinct wallets that have ever tended the creature. */
  carerCount: number
  /** Present only in the reply to `hello`, and only when one exists. */
  awayLine?: AwayLine | null
  /** Present only in the reply to `hello`: what this session may do. */
  you?: SessionInfo
}

/** Echoed back on `hello` so the client can grey out controls it may not use. */
export interface SessionInfo {
  wallet: string
  name: string
  /** False for guests. A read-only session renders everything and writes nothing. */
  canWrite: boolean
}

/**
 * A refused message.
 *
 * The protocol table in the design lists `state` as the only thing the server
 * sends, but a refusal has to be visible or the client cannot tell a rate limit
 * from a dropped packet. It carries no state — the client's own `state` is
 * still the last one the server sent.
 */
export interface ErrorMessage {
  t: 'error'
  code: ErrorCode
  message: string
  /** For `rate_limited`: epoch ms after which the same intent is accepted. */
  retryAt?: number
}

export type ErrorCode =
  /** A mutating message arrived before `hello`. */
  | 'hello_required'
  /** `hello` arrived twice on one connection. */
  | 'already_hello'
  /** Guest account. Read-only by design; see the server README. */
  | 'guest_read_only'
  /** Missing or unusable wallet. */
  | 'bad_wallet'
  /** Missing display name. An anonymous chain is a leaderboard, so it is refused. */
  | 'name_required'
  /** Too many mutating messages from this wallet this minute. */
  | 'rate_limited'
  /** Unparseable or unknown message. */
  | 'bad_message'

export type ServerMessage = StateMessage | ErrorMessage

// ---------------------------------------------------------------------------
// Parsing — shared so the client and the server agree on what is well-formed
// ---------------------------------------------------------------------------

/** Longest accepted emote id. */
export const MAX_EMOTE_ID_LENGTH = 96
/** Longest accepted display name. */
export const MAX_NAME_LENGTH = 64
/** Most wearable urns accepted on one `teach`. */
export const MAX_WEARABLES = 24
/** Longest accepted wearable urn. */
export const MAX_WEARABLE_LENGTH = 256

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function trimmedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > maxLength) return null
  return trimmed
}

/**
 * Turn raw JSON into a `ClientMessage`, or `null` if it is not one.
 *
 * Everything the client can send is bounded here: string lengths, array
 * lengths, and the set of accepted discriminators. A message that fails this
 * never reaches the game logic and never touches the database.
 */
export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (!isRecord(raw)) return null

  switch (raw['t']) {
    case 'hello': {
      const wallet = trimmedString(raw['wallet'], 128)
      if (wallet === null) return null
      // A missing name is a *semantic* refusal, not a malformed frame: the
      // server answers it with `name_required` so the client can say something
      // useful. So an empty string survives parsing and is judged in the room.
      if (typeof raw['name'] !== 'string') return null
      const name = raw['name'].trim().slice(0, MAX_NAME_LENGTH)
      return { t: 'hello', wallet, name, isGuest: raw['isGuest'] === true }
    }

    case 'teach': {
      const emoteId = trimmedString(raw['emoteId'], MAX_EMOTE_ID_LENGTH)
      if (emoteId === null) return null
      const rawWearables = raw['wearables']
      if (!Array.isArray(rawWearables)) return null
      const wearables: string[] = []
      for (const entry of rawWearables.slice(0, MAX_WEARABLES)) {
        const urn = trimmedString(entry, MAX_WEARABLE_LENGTH)
        if (urn !== null) wearables.push(urn)
      }
      return { t: 'teach', emoteId, wearables }
    }

    case 'feed':
      return { t: 'feed' }
    case 'pet':
      return { t: 'pet' }
    case 'stamp':
      return { t: 'stamp' }

    default:
      return null
  }
}

/** Type guard used by the rate limiter and the carer log. */
export function isMutating(message: ClientMessage): message is Exclude<ClientMessage, HelloMessage> {
  return message.t !== 'hello'
}
