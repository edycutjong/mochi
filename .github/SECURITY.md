# Security Policy

## Supported versions

Mochi is a single deployed creature backed by a single server, so there is only
one supported version: the latest commit on `main`. Fixes land there and are
deployed from there.

| Version | Supported |
|---|---|
| Latest `main` | Yes |
| Anything older | No |

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Report it privately, either way:

1. **GitHub private vulnerability reporting** — the
   [Security tab](https://github.com/edycutjong/mochi/security/advisories/new)
   of this repository. This is the preferred route: it keeps the report,
   discussion, and fix in one place, and it is private until an advisory is
   published.
2. **Email** — [edy.cu@live.com](mailto:edy.cu@live.com), with `mochi security`
   in the subject line.

Useful things to include:

- What kind of issue it is, and which half it affects — the scene (`src/`) or
  the server (`server/`).
- The file and line, or the protocol message, involved.
- Steps to reproduce, ideally against a local server (`cd server && npm start`).
- What an attacker gets out of it.

## What to expect

- **Acknowledgement** within 3 business days.
- An assessment and a rough timeline within 7 days of the acknowledgement.
- Progress updates as the fix moves, and credit in the advisory when it is
  published — unless you would rather stay anonymous, which is fine.

Please give us a reasonable window to ship a fix before disclosing publicly.

## Scope

In scope:

- The authoritative server in `server/` — the WebSocket protocol, message
  parsing, rate limiting, and the SQLite persistence layer.
- The scene in `src/`, including anything that lets one visitor affect another
  visitor's client.
- Anything that lets a caller write state they should not be able to write, or
  attribute an action to someone who did not perform it.

Out of scope:

- Vulnerabilities in the Decentraland client or platform itself — please report
  those to Decentraland.
- Denial of service achieved purely by volume against a self-hosted instance.
- Findings from automated scanners with no demonstrated impact.

## A note on secrets

This project holds none. The server has no credentials of its own, no API keys,
and no third-party accounts — every setting is a tunable with a safe default
(see [`server/.env.example`](../server/.env.example)). If a scan ever reports a
credential in this repository, that is itself the bug, and we would like to hear
about it.

## Known dependency advisories

Disclosed rather than left for you to discover in the alerts tab.

At the time of writing there are open advisories **entirely in the scene's
dependency tree and none in the server's.** Every one arrives transitively
through `@dcl/sdk`, which is the mandatory Decentraland scene SDK and cannot be
substituted.

| | |
|---|---|
| Server runtime dependencies | **1** (`ws`) — zero open advisories |
| Scene advisories | all transitive via `@dcl/sdk@7.26.0` |
| Largest cluster | `protobufjs` — the SDK's own wire-format encoder |

Two counts exist and they disagree, so neither is quoted as *the* number here:
`npm audit` currently reports **6** (4 high, 2 moderate), all in the scene's
tree. `npm audit fix` has been applied and resolved what it could without
breaking changes. The remainder need `npm audit fix --force`, which would
downgrade or replace packages the SDK pins and break the scene build.
**`@dcl/sdk@7.26.0` is the latest published version**, so no upgrade clears them.

### What is dismissed, and why

Two dismissals are recorded in the Security tab. Both are documented here so the
reasoning is visible without opening it.

**`extract-zip` — unvalidated symlink path traversal (high), dismissed as
tolerable risk.** It arrives via `@dcl/sdk → @dcl/sdk-commands → extract-zip`.
There is nothing to upgrade to: `2.0.1` is simultaneously the vulnerable version
and the latest ever published, and the advisory lists no patched release.
`@dcl/sdk-commands` is the build CLI, and neither it nor `extract-zip` appears in
the deployed bundle — checked with `grep -c extract-zip bin/index.js`, which
returns 0. The exposure is a developer extracting a hostile archive at build
time, not anything a visitor can reach.

**Three `js/unused-local-variable` alerts on `import ReactEcs`, dismissed as
false positives.** `jsx` is `"react"` with `jsxFactory: "ReactEcs.createElement"`,
so every JSX tag compiles to a call on that import. Removing it — the change the
alert implies — fails the build with `TS2874: This JSX tag requires 'ReactEcs' to
be in scope`. CodeQL does not read `jsxFactory`. The rule was **not** excluded in
a CodeQL config: that would have cleared the tab while also hiding genuine unused
variables. Each import carries a comment saying so, so nobody tidies it away.

### One thing worth being precise about

"Development dependency" is misleading for `@dcl/sdk` as a whole: it is declared
as one, but its runtime code is **bundled into the deployed scene**, so those
advisories are not purely build-time. What limits them is that a Decentraland
scene executes inside the client's own sandbox with no filesystem, no process
access and no ambient credentials — the scene cannot reach anything worth
reaching. The `extract-zip` case above is different and genuinely build-only,
because it comes from the CLI rather than the bundled runtime.

We would rather state this plainly than present a clean-looking dashboard.
