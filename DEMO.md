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

## Verify the server independently

```bash
cd server
npm test
```

78 tests across 15 suites, covering hunger reaching its floor and not passing
it, the away-line including its empty case, rate limiting, guest rejection,
and state surviving a reopen of the database.

## Performance

**«PENDING:perf-score»%** on the in-client Scene Limits panel — Samsung Galaxy
A54, High graphics profile, Dynamic Graphics off.

Reproduce it yourself rather than taking our word for it: In-Game Menu →
Settings → Graphics → Dynamic Graphics off → High, then the monitor icon at
the top right.

## What is not finished

Stated here rather than discovered:

- The capability probe in `docs/PROBE.md` has not been run on a device, so its
  results table is still empty. `MODE` at the top of `src/index.ts` switches
  the build to it.
- Emote *observation* — catching a move a visitor performs with the client's
  own emote wheel — is unverified on mobile. The picker route does not depend
  on it and is what the demo above uses.
