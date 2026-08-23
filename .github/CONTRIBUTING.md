# Contributing to Mochi

Thanks for taking an interest. Mochi is a Decentraland SDK7 scene plus a small
authoritative Node server, and both halves live in this one repository.

By participating you agree to abide by our
[Code of Conduct](CODE_OF_CONDUCT.md).

## Repository layout

| Path | What it is |
|---|---|
| `src/` | The Decentraland SDK7 scene — TypeScript, `react-ecs` UI, `Tween` motion |
| `server/` | The authoritative game server — Node, `ws`, `node:sqlite` |
| `server/test/` | The server test suite (`vitest`) |
| `scene.json` | Scene metadata and parcel layout |
| `ARCHITECTURE.md` | The diagram and the decisions behind the code |
| `DEMO.md` | How to run the thing and see it work |

The scene owns no state. It sends intents and renders what the server says, so
behaviour changes almost always belong in `server/`, not `src/`.

## Prerequisites

- **Node 22.5 or newer.** The server uses `node:sqlite`, which ships with the
  runtime from 22.5 onwards. There is no native module to build.
- No database server, no API keys, no accounts. See
  [`server/.env.example`](../server/.env.example) — every setting has a working
  default.

## Getting started

Install the two halves separately:

```bash
npm install                 # the scene, at the repository root
cd server && npm install    # the server
```

Run it locally:

```bash
cd server && npm start      # the authoritative server
npm run start:mobile        # the scene — prints a QR code for your phone
```

If you want data to look at without a second person, the server ships a local
fixture. Every row it writes is prefixed `DEV_ONLY_`, it writes to its own
database path, and it refuses to run with `NODE_ENV=production`:

```bash
cd server && npm run seed:dev
```

## Before you open a pull request

Both of these must pass:

```bash
npm run build           # at the repository root — builds and typechecks the scene
cd server && npm test   # 238 tests, 13 files, 100% coverage enforced
```

`npm test` in `server/` compiles the TypeScript before running, so it covers the
server typecheck too. If you want the typecheck on its own, `npm run typecheck`
in `server/` does it without emitting.

CI runs exactly these two commands, so a green local run is a green CI run.

## Tests

Server tests live in `server/test/` and run under `vitest`, which enforces 100%
line, branch and function coverage of `server/src/` — a patch that adds an
uncovered line fails CI. Add tests alongside the behaviour you change:

- New protocol message or field → extend the protocol parsing tests.
- New rule (rate limit, hunger, chain ordering) → a test that fails before your
  change and passes after.

The scene has no automated test suite; scene changes are verified by
`npm run build` and by actually looking at it, following [DEMO.md](../DEMO.md).

## Code style

- TypeScript throughout, ESM (`import ... from './thing.js'` — the `.js`
  extension on relative imports is required and intentional).
- Prettier settings are declared in the root `package.json`: no semicolons,
  single quotes, 120 columns, no trailing commas.
- `server/src/protocol.ts` has **no imports at all**, on purpose — the scene
  compiles against it. Keep it that way.
- Comments should explain *why*, not restate the code. The existing files are
  the reference for tone.

## Commit messages

Please use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(server): credit the teacher on every chain move
fix(scene): latch the pet hold on press so a sliding thumb does not cancel it
docs: describe the away-line in ARCHITECTURE.md
test(server): cover hunger decay against the floor
chore(deps): bump ws to 8.18.1
```

Common types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`,
`build`, `ci`. Scope is optional; `scene` and `server` are the useful ones.

## Pull requests

1. Branch off `main`.
2. Keep the change narrow — one behaviour per pull request.
3. Fill in the pull request template, including how you verified it by hand.
4. If you changed anything a player can see, say what it looks like now.

## Reporting bugs and requesting features

Use the [issue templates](ISSUE_TEMPLATE). For anything security-related, do
**not** open an issue — see [SECURITY.md](SECURITY.md).

## License

Contributions are accepted under the [MIT License](../LICENSE) that covers this
project.
