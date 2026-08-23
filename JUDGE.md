# For judges

Everything you need, in the order you need it. No setup, no keys, no cloning.

## The claim

**A giant pastel blob co-parented by every stranger who visits** — its size is
the literal sum of every feeding, and its dance is a chain where each move was
taught by a named stranger.

## The 30-second path

1. Open **«PENDING:world-url»** in the Decentraland mobile app.
2. You arrive facing the creature. Wait two seconds — it notices you and
   waddles over. Nothing to press yet.
3. Tap **FEED**. It gulps, gets fractionally bigger, and your name appears on
   the plaque beside it.
4. Tap **TEACH**, pick any move. Your avatar performs it, and a dancer joins
   the ring wearing your wearables, with your name above them.
5. Look at the plaque. It names the last person who was here before you, and
   how long ago.

That is the whole product. There is no tutorial because there is nothing to
explain — two buttons, one creature, no typing anywhere.

**If you are the first person here today,** the clearing will be quiet: the
plaque and the ring are made of other people, so they fill as people arrive.
That is the design working, not failing.

## Receipts

Every number below is measured and reproducible. Full detail in
[DEMO.md](DEMO.md).

| | |
|---|---|
| Tests | **238**, across 13 files |
| Server coverage | **100%** — lines, branches, functions and statements |
| Exhaustive verification | **78,482 combinations** — no input produces a starving creature |
| Real run | 4 sessions, 6 intents, **1,845 ms**, 4,096-byte database |
| Away-line, local run | `{name: "Rue", kind: "feed"}` — resolved from real rows, different wallet. Kito and Rue are names from the four-session local run in DEMO.md, not from the live world |
| Provider cost | **$0.00** — no external API, no model, nothing on-chain |
| Scene performance | **«PENDING:perf-score»%**, Galaxy A54, High profile |
| Runtime dependencies | **1** (`ws`) |

## Reproduce it

The real path. Nothing is mocked, and there is no flag that turns off the
thing being demonstrated.

```bash
cd server && npm install && npm start    # Node 22.5+
npm install && npm run start:mobile      # QR code for your phone
```

The local run uses the same server, the same schema and the same protocol as
the deployed World.

**Verify the numbers yourself:**

```bash
npm test
```

*(CI runs the same command on every push, plus CodeQL and a full-history
secret scan. Those are checks on the code, not alternative ways to run the
product.)*

## Honest limitations

Three real ones.

**Emote observation is unverified on the mobile client.** Catching a move a
visitor performs with the client's *own* emote wheel depends on behaviour the
platform documentation does not settle. The in-scene picker does not depend on
it, so what is at risk is spontaneity, not the mechanic — but we would rather
say so than let you discover it.

**Audio is decorative.** The mobile client has no audio event implementation,
so nothing in the design carries meaning through sound.

**The server is one process with one SQLite file.** Correct for one creature
and a few hundred carers. It does not shard, and it is not built to.

## Links

- **Live World** — «PENDING:world-url»
- **Repository** — https://github.com/edycutjong/mochi
- **Architecture** — [ARCHITECTURE.md](ARCHITECTURE.md)
- **Full demo walkthrough** — [DEMO.md](DEMO.md)
