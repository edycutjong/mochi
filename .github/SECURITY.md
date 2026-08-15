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
