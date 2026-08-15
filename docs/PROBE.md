# Capability probe

Mochi targets the Decentraland **mobile** client. Several SDK7 features behave
differently there, or are not implemented yet, and the documentation does not
settle all of them. This build answers five of those questions on a real device
before any of them can shape a week of work.

Run it, read the five answers off the phone screen, record them below, then move
on. The probe is scaffolding and gets deleted once the answers are in.

## Run it

The phone and this machine must be on the **same Wi-Fi**. The preview is served
from here; the QR code points at a LAN address.

```bash
npm install
npm run start:mobile     # prints a QR code in the terminal
```

Scan the QR with the phone camera — it opens the Decentraland mobile app on the
scene. Open the app once by hand first, or the deep link will not resolve.

The heads-up display shows the answers. Emote counters update live, so
performing an emote and watching the number move *is* the test. The terminal
also logs every detected emote, which is useful when the screen is busy.

Hot reload works: edit, save, and the phone picks it up without re-scanning.

## The five checks

The probe places each visual check in the spawn camera's view, next to a
reference object, so a wrong result looks wrong instead of being a judgement
call.

| # | Question | How to read it |
|---|---|---|
| 1 | Does `AvatarShape` render? | Look **left**. An avatar should stand by the blue post, roughly as tall as it (1.8m). The probe also re-triggers its emote every 4s to confirm animation looping works by bumping `expressionTriggerTimestamp` — avatar emotes play once otherwise. |
| 2 | Are avatar emotes reported to the scene? | **The decisive one.** Open the emote wheel, perform an emote, watch the `2. EMOTE` line. Both detection paths are counted separately — see below. |
| 3 | Do particles render? | Look **right**. Sparks should fall by the pink post. |
| 4 | Does `TextShape` sit where it does on desktop? | The floating text is pinned at exactly y=2.0, level with the **top face** of the yellow cube. If it floats above or below that line on the phone, the offset is real. |
| 5 | Is there a photo capture button? | Look at the client's own HUD, not the scene. Note whether a camera/reel control exists. |
| 6 | Do the declared permissions prompt the user? | `scene.json` declares `USE_WEBSOCKET` and `USE_FETCH`, which the persistence layer will need. Watch the **first few seconds after the scene loads** for any permission dialog, banner or consent step. |

### Why check 2 is instrumented twice

`AvatarEmoteCommand` is a **grow-only value set**, not a last-write-wins
component. The explorer appends an entry to a per-entity set, on every player
entity in the scene — local player and remote avatars alike. Entries carry a
monotonic `timestamp` and the set stays sorted by it.

Two paths can observe that, and they can fail independently:

- **poll** — the set actually grew, i.e. emote data reached the scene.
- **onChange** — the callback fired. `onChange` is inherited from
  `BaseComponent`, so it does apply to grow-only sets.

Data arriving while `onChange` stays silent is a different problem from no data
at all, and only one of the two is fatal. The HUD reports:

| HUD line | Meaning |
|---|---|
| `… perform an emote now` | Nothing seen yet. |
| `DATA YES / onChange NO` | Emotes reach the scene; use polling, not callbacks. |
| `PASS poll N / onChange N` | Both paths work. |

The docs are ambiguous here. A note reading *"This feature is only supported in
the Desktop client"* sits inside the **"Detect when an emote finishes"**
section, so on its face it scopes to the `EmoteState` lifecycle rather than to
basic detection, and `AvatarEmoteCommand` is not listed on the mobile
missing-features page at all. No page states outright that basic detection works
on mobile. Hence measuring it.

## Known issues this is checking against

Recorded so a result can be told apart from a surprise:

- **Particles** — listed on the mobile missing-features page as arriving
  July–August 2026. This is checking whether that landed. If not, the fallback
  is `LightSource` plus emissive materials; the design assumes no particles
  either way.
- **TextShape** — a live issue reports text positioned at different heights on
  mobile versus Unity, ETA August 2026. Also: `TextShape` is not clickable
  (pointer events do not fire on it), and every font currently renders as sans
  serif regardless of the `Font` value.
- **Avatars** — a nearby issue reports Unity-client avatars not visible on the
  mobile app. `AvatarShape` itself carries no documented mobile limitation.
- **Permissions** — `requiredPermissions` is absent from the documentation
  entirely; the enum is only discoverable in the `@dcl/schemas` package. So
  whether declaring `USE_WEBSOCKET` costs a user-facing consent step is
  unknown, and on a mobile-first experience an extra dialog between a visitor
  and the creature is a real cost. Declared early precisely so check 6 can
  measure it now instead of on the day the server lands.

  Note that `ALLOW_TO_TRIGGER_AVATAR_EMOTE` is **not** declared. Triggering an
  emote on a scene-owned `AvatarShape` (via `expressionTriggerTimestamp`, as
  check 1 does) is believed to be a different thing from making the *player's*
  avatar emote, which is what that permission appears to govern. If check 1's
  emote loop does not animate, this assumption is the first thing to revisit.

## Results

Filled in from a real device. Until then this table is the open question, not a
record.

| # | Check | Result | Device / notes |
|---|---|---|---|
| 1 | `AvatarShape` renders | _pending_ | |
| 1b | Emote loop via timestamp bump | _pending_ | |
| 2 | Emote data reaches scene (poll) | _pending_ | |
| 2b | `onChange` fires | _pending_ | |
| 3 | Particles render | _pending_ | |
| 4 | `TextShape` vertical position | _pending_ | |
| 5 | Photo capture control exists | _pending_ | |
| 6 | Permission prompt shown on load | _pending_ | |

Also worth writing down while the phone is in hand: the reported platform,
canvas size, FPS, and whether the account is a guest or a wallet — all four are
on the top two HUD lines.
