## What this changes

<!-- One or two sentences. If it fixes an issue, add "Closes #123". -->

## Why

<!-- The problem behind the change. -->

## Which half

- [ ] The scene (`src/`)
- [ ] The server (`server/`)
- [ ] Docs / tooling only

## Checks

```bash
npm run build           # scene build + typecheck, at the repository root
cd server && npm test   # 238 tests (vitest), 100% coverage enforced
```

- [ ] `npm run build` passes at the repository root
- [ ] `cd server && npm test` passes
- [ ] Tests added or updated for the behaviour I changed (server changes)
- [ ] I ran it by hand and watched it work — see below

## How I verified it by hand

<!--
e.g. "Ran `cd server && npm start` and `npm run start:mobile`, fed Mochi twice
from the phone, confirmed the blob grew and the plaque named me."
-->

## Screenshots or recording

<!-- Required if a player can see the difference. Before/after if you have it. -->

## Anything reviewers should know

- [ ] This changes the wire protocol (`server/src/protocol.ts`) — the scene and
      server must be deployed together
- [ ] This changes the database schema
- [ ] This adds or changes an environment variable — `server/.env.example` and
      the table in `server/README.md` are updated to match
- [ ] This adds a dependency — say which and why:

<!--
Reminders:
- Conventional commit messages: feat(server): ..., fix(scene): ..., docs: ...
- `server/src/protocol.ts` must stay import-free; the scene compiles against it.
- No credentials anywhere in the tree. This project has none.
-->
