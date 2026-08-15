# Mochi — authoritative game server

Mochi is a creature that many people tend and nobody owns. Its size, its dance and its plaque are a
record of everyone who has ever looked after it, so all of that state has to live somewhere that
outlives any one visit. This is that somewhere.

The scene is a **renderer and an intent sender**. It never owns state and it never writes a number
the server did not give it. Everything below is enforced here, server-side, on the assumption that
the client can be replaced by anything.

- **Node + TypeScript**, WebSocket, no framework.
- **SQLite in one file**, through Node's built-in `node:sqlite` — one writer, a few thousand rows,
  nothing to operate alongside the game server and no native module to rebuild on the host.
- **One runtime dependency**: `ws`. That is the whole list.

---

## Run it

Requires **Node 22.5 or newer** (`node:sqlite` ships with the runtime from that version).

```bash
cd server
npm install
npm run build        # tsc -> dist/
npm start            # listens on 0.0.0.0:8080, database at ./data/mochi.db
```

`npm run dev` is `build` followed by `start`. Both create the database file and its directory on
first run; there is no migration step and no setup script.

### Tests

```bash
npm test             # builds, then runs node:test over dist/test
```

82 tests across 16 suites. They cover hunger decay against its floor, the away-line query including
every case where the honest answer is nothing, the rate limiter's sliding window, guest refusal at
each write path, restart survival through a real file on disk, and an end-to-end pass over a real
WebSocket.

```bash
npm run typecheck    # tsc --noEmit, strict
```

### A local database to look at

```bash
npm run seed:dev     # writes ./data/dev.db, rows prefixed DEV_ONLY_
```

This is a **development fixture only**. It writes to its own path, refuses to run with
`NODE_ENV=production`, and every row it creates is named `DEV_ONLY_…` and flagged `is_seed` so it is
identifiable in the data itself. It is not how the live world gets its history.

### Docker

```bash
docker build -t mochi-server server/
docker run -p 8080:8080 -v mochi-data:/data mochi-server
```

The database is a mounted volume, not image content. Redeploying without one throws away the
history, which is the only unrecoverable failure this server has.

---

## Environment

Every value has a default and the server starts with none of them set. Nothing here is a secret —
the server holds no credentials.

| Variable | Default | What it does |
|---|---|---|
| `MOCHI_HOST` | `0.0.0.0` | Bind address |
| `MOCHI_PORT` | `8080` | Port for both the WebSocket and the health endpoint |
| `MOCHI_DB_PATH` | `./data/mochi.db` | SQLite file. Point it at a mounted volume in production |
| `MOCHI_HUNGER_DECAY_HOURS` | `36` | Hours from a full belly to the hunger floor |
| `MOCHI_HUNGER_FLOOR` | `0.15` | The value hunger decays to and never passes |
| `MOCHI_FEED_GAIN` | `0.2` | Hunger restored by one feeding |
| `MOCHI_CHAIN_LIMIT` | `40` | Chain moves included in a `state` message |
| `MOCHI_CARER_WINDOW_HOURS` | `24` | How far back the carer list reaches |
| `MOCHI_LIMIT_FEED` | `4` | Feeds per wallet per minute |
| `MOCHI_LIMIT_TEACH` | `2` | Chain moves per wallet per minute |
| `MOCHI_LIMIT_PET` | `10` | Pets per wallet per minute |
| `MOCHI_LIMIT_STAMP` | `2` | Guestbook stamps per wallet per minute |

`MOCHI_DEV_DB_PATH` (default `./data/dev.db`) is read by the development fixture only, and it
refuses to share a path with `MOCHI_DB_PATH`.

---

## Protocol

JSON over WebSocket. Every message is an object with a short discriminator `t`. The types are
exported from [`src/protocol.ts`](src/protocol.ts), which has no imports at all so the Decentraland
scene compiles against the same definitions the server enforces.

### Client → server

| `t` | Payload | Server does |
|---|---|---|
| `hello` | `wallet`, `name`, `isGuest` | Opens the session. Replies with the full state, plus **the away-line** and what this session is allowed to do. Writes nothing |
| `feed` | — | Rate-limit, raise hunger from its decayed value, `feed_count + 1`, write a `carer_event`, broadcast |
| `teach` | `emoteId`, `wearables[]` | Rate-limit, append a `chain_move` carrying the teacher's name and wearables, write a `carer_event`, broadcast |
| `pet` | — | Rate-limit, write a `carer_event`, broadcast |
| `stamp` | — | Rate-limit, write a `carer_event`, broadcast |

Nothing but `hello` is accepted before `hello`.

### Server → client

| `t` | Payload | When |
|---|---|---|
| `state` | `now`, `pet`, `chain[]`, `carers[]`, `chainLength`, `carerCount` — plus `awayLine` and `you` in the handshake reply only | Reply to `hello`, and broadcast to everyone after any successful write |
| `error` | `code`, `message`, `retryAt?` | A refused message. Carries no state; the client's last `state` is still current |

`error` exists so a client can tell a rate limit from a dropped packet. It is the only message that
is not `state`, and it never changes what the client is rendering.

**Error codes:** `hello_required` · `already_hello` · `guest_read_only` · `bad_wallet` ·
`name_required` · `rate_limited` (carries `retryAt`, epoch ms) · `bad_message`.

### HTTP

| Route | Returns |
|---|---|
| `GET /health` | `{ ok, uptimeMs, connections, feedCount, chainLength, carerCount, hungerFloor, fullToFloorMs }` — what an external uptime monitor polls |
| `GET /state` | The same view the scene gets, so the world can be inspected from a browser |

---

## The rules the server owns

### Size is the count of feedings

`pet.feed_count` is the literal number of times the creature has been fed, ever. The client renders
a scale from it and never sends it; a message carrying a `feedCount` field is simply not part of the
protocol and is ignored along with the rest of the frame it arrived in.

### Hunger decays to a floor, never to zero

Hunger is a number in `0..1`, stored with the timestamp it was written at. The current value is
recomputed from those two on every read, so decay is a pure function of *(stored value, stored time,
now)*. Two consequences:

- **A restart changes nothing.** No timer has to survive, and there is no accumulated drift to lose.
  A creature that was hungry when the process died is exactly as hungry when it comes back.
- **Decay stops at the floor.** From full, hunger reaches `MOCHI_HUNGER_FLOOR` after
  `MOCHI_HUNGER_DECAY_HOURS` and stays there for as long as nobody comes — a week, a year. A
  creature nobody has visited should read as *wanting company*. It must never read as dying or
  abandoned, so there is no path from any input to a hunger of zero.

### The away-line

On `hello`, and nowhere else, the server answers one question: **who was the first person after
you?**

> Find the earliest `carer_event` by a *different* wallet that happened after this wallet's most
> recent event, and return that person's name.

That is a sentence addressed to one person — *"Kito fed Mochi after you left"* — rather than a
count announced to the room, which is why it is computed per connection and never broadcast.

The cases where the answer is nothing are the ones worth stating, because inventing a name in any of
them would be the only dishonest string in the product:

- you have never touched the creature — a first-time visitor is owed no such sentence
- nobody has been here since you last were
- the only later events are your own; following yourself is not a social fact, which is why the
  query excludes by *wallet* rather than by row

Ties on the same millisecond resolve by insertion order, so the answer is stable across restarts and
identical for every caller. See `Store.awayLine` and `test/away-line.test.ts`.

### Rate limits

Per **wallet**, per minute, per message kind — a sliding window, not fixed buckets, so a burst
cannot straddle a boundary and land at twice the limit. Opening a second connection buys no extra
allowance, and one wallet exhausting its limit has no effect on anybody else's.

The creature is shared and permanent. Without this, one script can add ten thousand feedings to a
number that is supposed to be the sum of real visits, or bury a communal dance chain under its own
emote. Refused messages write nothing to either log and do not extend the wait.

### Guests cannot write

The scene reads `isGuest` from `PlayerIdentityData`. A guest session connects, receives state and
watches everything; it cannot produce a `carer_event` or a `chain_move`. The refusal is made here
rather than in the client, because the flag arrives *from* the client — the check exists on the
server precisely because that is the only place it means anything.

A session is also refused if it cannot present a wallet address or a display name. The `chain_move`
table declares `teacher_name NOT NULL` for the same reason: a credit nobody's name is attached to
credits nobody, and an anonymous chain is just a leaderboard.

---

## Data model

Three tables: one row of derived state, and two append-only logs everything else is rendered from.
The full DDL is in [`src/db.ts`](src/db.ts).

```
pet          one row, id = 1     hunger, feed_count, last_fed_at, last_fed_by
chain_move   append-only         seq, emote_id, teacher_id, teacher_name, wearables, taught_at, is_seed
carer_event  append-only         id, wallet, name, kind, at, is_seed
```

Nothing is ever updated except the single `pet` row, and nothing is ever deleted.

**`is_seed`** marks rows produced during the opening community seeding drive — *when* a row was created,
not whether the person behind it was real. Every row carries a real wallet that really performed the
act, which is why seeded rows are counted by the away-line and by every total like any other. The
flag is in the schema rather than in a comment so the distinction survives being read by someone who
never saw this file.

---

## Layout

```
server/
├── src/
│   ├── protocol.ts   wire types + parsing. No imports — the scene compiles against this too
│   ├── config.ts     every tunable, from the environment, with defaults
│   ├── hunger.ts     decay and feeding, pure functions
│   ├── db.ts         schema, migration, connection
│   ├── store.ts      all SQL, including the away-line
│   ├── game.ts       the room: all the rules, none of the networking
│   ├── ws.ts         the transport: WebSocket + health endpoints, none of the rules
│   └── index.ts      entry point, graceful shutdown
├── scripts/seed-dev.ts   local fixture, DEV_ONLY_ rows, refuses NODE_ENV=production
└── test/             node:test — hunger, away-line, rate limits, room rules, restart, transport
```

The split that matters is `game.ts` / `ws.ts`. The room talks to the outside world through a
one-method interface, so every rule above is tested by handing the room messages directly and
watching what does and does not reach the database — no sockets, no timing, no flakiness.

---

## Operations

The server is expected to run unattended for weeks.

- **Shutdown** is graceful on `SIGINT`/`SIGTERM`: sockets closed, then the database, so SQLite is
  never left mid-write.
- **WAL journaling** with `synchronous = NORMAL`: durable across a process crash, and the health
  check can read while a write is in flight.
- **Dead connections are reaped** every 30s by ping/pong. A phone that walks out of range stops
  reading without closing, and over weeks those ghosts would otherwise accumulate.
- **Frames are capped** at 32 KB, and every string and array in the protocol is length-bounded
  before it reaches the game logic.
- **Back it up.** The database file is the entire accumulated history and the one thing here that
  cannot be rebuilt. Copy it off the host on a schedule.
