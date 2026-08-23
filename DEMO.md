# Demo

Two ways to see this working: visit the live World, or run the whole thing
locally in about two minutes.

Nothing here disables anything. There is no mock mode, no fixture flag and no
switch that turns off the part being demonstrated — the local run uses the
same server, the same schema and the same protocol as the deployed one.

## The live World

**«PENDING:world-url»**

Open it in the Decentraland mobile app. The creature is whatever everyone has
made it by the time you arrive.

## Run it locally

Requires **Node 22.5 or newer** — the server uses the SQLite driver built into
the runtime, so there is nothing to compile.

### 1. Start the server

```bash
cd server
npm install
npm start
```

You should see:

```
mochi-server listening on 0.0.0.0:8080 · db=./data/mochi.db · feedings=0 chain=0 carers=0
```

An `ExperimentalWarning` about SQLite is expected and harmless.

### 2. Start the scene

In a second terminal, from the repository root:

```bash
npm install
npm run start          # desktop
npm run start:mobile   # prints a QR code for a phone on the same Wi-Fi
```

The scene connects to `ws://127.0.0.1:8080` by default (`src/config.ts`).

### 3. Walk the loop

| Do this | Expect |
|---|---|
| Arrive | The creature notices you and waddles over |
| Tap **FEED** | It gulps, gets fractionally bigger, and your name appears on the plaque |
| Tap **TEACH**, pick a move | Your avatar performs it, and a dancer appears in the ring wearing your wearables |
| Hold on its body | It compresses under your thumb. Slide off — it does not cancel |
| Tap the totem | Your visit is signed |
| Reload | Everything is still there. The size, the chain and the names are on the server |

### 4. See the away-line

This is the part worth the extra minute, because it needs two people.

1. Connect as one wallet and feed the creature.
2. Connect as a **different** wallet and feed it.
3. Come back as the first wallet.

On arrival the first visitor is told, by name, who tended the creature after
they left — *"Rue fed Mochi after you left."*

## Receipt from a real run

Measured, not estimated. Four sessions against a freshly created database, on
a 2026 MacBook:

```
server cold start → listening        db=./data/mochi.db  feedings=0 chain=0 carers=0
4 sessions, 6 intents                1,845 ms wall clock
final database                       4,096 bytes
  pet                                1 row     feed_count = 2
  chain_move                         1 row     'wave', taught by Kito
  carer_event                        3 rows    2 feeds, 1 teach
```

What the run proved, in order:

| Step | Result |
|---|---|
| Kito connects | `canWrite=true`, `awayLine=null` — nobody has been since |
| Kito feeds and teaches | `feedCount=1`, `chainLength=1`, plaque reads *Kito* |
| Rue feeds | `feedCount=2`, plaque reads *Rue* |
| **Kito returns** | **`awayLine={name:"Rue", kind:"feed"}`** |
| Guest connects and tries to feed | refused `guest_read_only`, `canWrite=false`, still renders everything |

The fourth row is the one worth reading twice. That is the away-line — the
only message in the system addressed to a person rather than a room — resolving
to a real name, from real rows, written by a different wallet.

**Provider cost: $0.00.** There is nothing to bill. This project makes no
external API calls, has no model, no chain and no paid service anywhere in its
path. The only dependency at runtime is `ws`.

## Verify the server independently

```bash
npm test
```

**238 tests across 13 files**, at **100% line and branch coverage** of the
server — run `npm run test:coverage` for the table. One test is exhaustive
rather than example-based:

```
40,480 decay combinations verified
36,432 starvation combinations refuted
 1,150 feeding combinations verified
   420 no-punishment combinations verified
```

**78,482 combinations**, sweeping every stored value against every elapsed
time against every configuration — including NaN, ±Infinity, negative hunger,
values above 1, and time running backwards from a clock correction.

None of them produces a creature that starves. That property is the emotional
premise of the whole design, so it is verified across its input space rather
than at a handful of points.

The rest of the suite covers the away-line including its empty case, rate
limiting, guest rejection, and state surviving a reopen of the database.

## Performance

**«PENDING:perf-score»%** on the in-client Scene Limits panel — Samsung Galaxy
A54, High graphics profile, Dynamic Graphics off.

Reproduce it yourself rather than taking our word for it: In-Game Menu →
Settings → Graphics → Dynamic Graphics off → High, then the monitor icon at
the top right.

## What is not finished

Stated here rather than discovered:

- The capability probe in `docs/PROBE.md` has been run on a real device and most
  of it came back clean: `AvatarShape` renders, the emote loop driven by
  `expressionTriggerTimestamp` works, and **particles render** — the mobile
  missing-features page listed those as unsupported, so the design had already
  been built to do without them. One row is still open, below. `MODE` at the top
  of `src/index.ts` switches the build back to the probe.
- Emote *observation* — catching a move a visitor performs with the client's
  own emote wheel — is the probe's one unanswered check. The picker route does
  not depend on it and is what the demo above uses, so what is unresolved is how
  spontaneous TEACH can be, not whether it works.
