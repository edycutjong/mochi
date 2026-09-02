# For judges

Everything you need, in the order you need it. No setup, no keys, no cloning.

## The claim

**A giant pastel blob co-parented by every stranger who visits** — its size is
the literal sum of every feeding, and its dance is a chain where each move was
taught by a named stranger.

## The 30-second path

1. Open **https://decentraland.org/jump/?realm=wunderland.dcl.eth** in the
   Decentraland mobile app.

   <details>
   <summary>📱 Scan instead of retyping it</summary>
   <br/>
   <img src="docs/assets/world-qr.png" alt="QR code that opens wunderland.dcl.eth in Decentraland" width="180">
   <br/>
   <em>The scene runs on desktop and the web too, but it was designed for a
   thumb and every judging criterion here is a mobile one — so the phone is the
   honest place to test it.</em>
   </details>
2. You arrive facing the creature. Wait two seconds — it notices you and
   waddles over. Nothing to press yet.
3. Two low props flank the path in front of the creature, each with a word
   floating over it. Tap the **bowl of berries** on the left, marked *feed*.
   Mochi gulps, gets fractionally bigger, and your name appears on the plaque.
4. Tap the **pale stage** on the right, marked *teach*, and pick any move. Your
   avatar performs it, and a dancer joins the ring wearing your wearables, with
   your name above them.
5. Look at the plaque. It names the last person who was here before you, and
   how long ago.

That is the whole product. There is no tutorial because there is nothing to
explain — four things to touch, one creature, no typing anywhere. The scene
draws no buttons and covers none of the client's own controls: every verb is a
tap on an object in the world.

**If you are the first person here today,** the clearing will be quiet: the
plaque and the ring are made of other people, so they fill as people arrive.
That is the design working, not failing.

## Receipts

Every number below is measured and reproducible. Full detail in
[DEMO.md](DEMO.md).

| | | Regenerate with |
|---|---|---|
| Tests | **238** server across 13 files · **36** headless scene across 3 | `npm test` · `npm run test:scene` |
| Server coverage | **100%** — lines, branches, functions and statements | `npm run test:coverage` |
| Exhaustive verification | **78,482 combinations** — no input produces a starving creature | `npm test` |
| Real run | 4 sessions, 6 intents, **1,845 ms**, 4,096-byte database | walkthrough in DEMO.md |
| Away-line, local run | `{name: "Rue", kind: "feed"}` — resolved from real rows, different wallet. Kito and Rue are names from the four-session local run in DEMO.md, not from the live world | walkthrough in DEMO.md |
| Intent latency | **p50 0.67 ms · p95 0.94 ms · p99 2.29 ms**, N=2,160, rate limiter on | `npm run bench` |
| `GET /state` | **p50 0.54 ms · p95 0.90 ms · p99 2.32 ms** at a 40-move chain | `npm run bench` |
| Throughput | **425 intents/s** from 24 concurrent wallets, 12,120 frames fanned out | `npm run bench` |
| Scene budget, 1 parcel | **32/200 entities · 14/20 materials · 0/10 textures** | `npm run budget:scene` |
| Ring rebuilds per busy minute | **18 avatar entities, down from 120** | `npm run test:scene` |
| Deployable payload | **6,888 KB** against the 25,000 KB gate CI enforces | `du -sk bin assets images main.crdt scene.json` |
| Provider cost | **$0.00** — no external API, no model, nothing on-chain | — |
| Runtime dependencies | **1** (`ws`) | `server/package.json` |
| Scene performance | **88–90%**, Galaxy S24 Ultra, High profile | **needs a phone — see below** |

The last row is the only number here no command can produce: it is the
Decentraland client's own Scene Limits reading, so it needs the device in hand.

**Read it as a ceiling, not a guarantee.** It was measured on a Galaxy S24
Ultra, which is a flagship. Decentraland's own guidance is to test on a
*mid-spec* device like the Galaxy A54, and that measurement has not been taken —
so a mid-range phone will score lower than 88–90% and by how much is unknown.
The fidelity ladder in `src/mochi/fidelity-watchdog.ts` exists for that case: it
drops the ghost ring from six avatars to three to name-tags when frame time
stays over budget, so a slower device gets a plainer clearing rather than a
stuttering one.

The panel lives in the SDK preview, not in the deployed World — `npm run
start:mobile`, scan the QR, then the monitor icon at the top right.

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
npm test               # 238 server tests, 100% coverage
npm run test:scene     # 41 headless scene tests + the one-parcel budget audit
npm run bench          # the latency and throughput table, ~30 seconds
npm run ci             # all of it, the way CI runs it
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

- **Live World** — https://decentraland.org/jump/?realm=wunderland.dcl.eth
- **Repository** — https://github.com/edycutjong/mochi
- **Architecture** — [ARCHITECTURE.md](ARCHITECTURE.md)
- **Full demo walkthrough** — [DEMO.md](DEMO.md)
