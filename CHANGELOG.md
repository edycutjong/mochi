# Changelog

Every release on this project is cut automatically from Conventional Commits
by semantic-release, and only after the full CI pipeline has passed.

## [1.2.0](https://github.com/edycutjong/mochi/compare/v1.1.1...v1.2.0) (2026-08-22)

### Features

* **web:** route judges to JUDGE.md, and give the card a call to action ([0fc20b1](https://github.com/edycutjong/mochi/commit/0fc20b182eccea691ceffbbc15ade577adef58bd))

### Performance

* **web:** mobile Lighthouse 91 to 96 ([af8de85](https://github.com/edycutjong/mochi/commit/af8de851733a004f4c7d8036e65a651f1997de71))

## [1.1.1](https://github.com/edycutjong/mochi/compare/v1.1.0...v1.1.1) (2026-08-22)

### Fixes

* **ci:** least-privilege tokens, pinned actions, patched transitive deps ([36e7a5c](https://github.com/edycutjong/mochi/commit/36e7a5cb008b168ab203671b7711f675f21d6159))

### Documentation

* draw the architecture, and say where to find everything ([6571e54](https://github.com/edycutjong/mochi/commit/6571e548ccf6f7576c61f8c0b998a0af3fb5146f))

## [1.1.0](https://github.com/edycutjong/mochi/compare/v1.0.0...v1.1.0) (2026-08-22)

### Features

* **web:** landing page and pitch deck, deployed to mochi.edycu.dev ([02ab2f1](https://github.com/edycutjong/mochi/commit/02ab2f14c334b665acf9bdd7583b4bb28d92b8e3))

## 1.0.0 (2026-08-22)

### Features

* aliveness — the tween squash-stretch language ([08ccb44](https://github.com/edycutjong/mochi/commit/08ccb44b4448bb35f571bc523830f2c73f0be7a1))
* authoritative server, and wire the scene to it ([449a713](https://github.com/edycutjong/mochi/commit/449a713a29735ddfa43e28307566685c2a94ddab))
* meadow blockout, creature geometry, thumb-arc HUD ([1d6d38b](https://github.com/edycutjong/mochi/commit/1d6d38b1faaef8157adcb7620ba00c519e691a9b))
* memory dancers with the fidelity ladder ([a0e4260](https://github.com/edycutjong/mochi/commit/a0e4260bc425416b0036e46750551b36a15511aa))
* **probe:** day-1 capability probe for the mobile client ([46f3b97](https://github.com/edycutjong/mochi/commit/46f3b978a8cb512584230c7c9c76fe84e4376505))
* server is live on Fly.io, scene points at it ([e40dd1a](https://github.com/edycutjong/mochi/commit/e40dd1a09e4c8c1105636590d1db5ec1d8eb351a))
* **server:** allow cross-origin reads of /health and /state ([b8b8ee9](https://github.com/edycutjong/mochi/commit/b8b8ee982fd73766c00368e36db4e14a6466cfbf))
* submission readiness gate ([82bb9d9](https://github.com/edycutjong/mochi/commit/82bb9d9c0a8cece48eb75f5463437662611787f1))
* TEACH, the emote picker, and the carer plaque ([5902043](https://github.com/edycutjong/mochi/commit/5902043b512b5a82db9943072e1ef946c8a68eb7))
* the chain replay, and hunger you can see ([1708340](https://github.com/edycutjong/mochi/commit/1708340d718cb40dc3bccced9da0c1ad7758c4b7))

### Fixes

* **tsconfig:** drop the dead path mapping, and pin the editor's compiler ([5572e17](https://github.com/edycutjong/mochi/commit/5572e1724db49f485fb4da7b910afb50bc15e100))
* **tsconfig:** resolve with bundler instead of the deprecated node10 ([73f7bb6](https://github.com/edycutjong/mochi/commit/73f7bb6412b6a3596ff5c0ded20daa5bbf840329))
* **ws:** decode every inbound frame shape, not just Buffer ([a90ca52](https://github.com/edycutjong/mochi/commit/a90ca5201d288f715c5b41fe60f530bac438c8a5))

### Refactoring

* **game:** drop the Sink.close hook nobody calls ([d3aced5](https://github.com/edycutjong/mochi/commit/d3aced559b698a8053eb1696e3fbc932fbedfd0f))

### Documentation

* correct the probe status, the test count and the hero images ([06ff8e5](https://github.com/edycutjong/mochi/commit/06ff8e54d96492b4f13e662d692875d6c6bd48b6))
* judge-facing README, DEMO and ARCHITECTURE ([c72d44f](https://github.com/edycutjong/mochi/commit/c72d44f65c1a26fa4f68e1bd225d2cf7347d4861))
* normalize README to the canonical judge-facing pattern ([2033f7f](https://github.com/edycutjong/mochi/commit/2033f7fd17452ba9eab74a8bd425c1736c5d1bd0))
* probe results from a real device, and back to scene mode ([d4cc94f](https://github.com/edycutjong/mochi/commit/d4cc94f41677bf27d1512320500f3ecf61abb0f7))
* probe run sheet and results table ([915990e](https://github.com/edycutjong/mochi/commit/915990e934724c9814e6b80f1a4e8fdcb74cb055))
* state the coverage figure the suite now actually reports ([a9d95be](https://github.com/edycutjong/mochi/commit/a9d95bec28893f3f349e10a1dbcc0e19be3898b6))
* stop quoting one advisory count that two tools disagree on ([4ef2236](https://github.com/edycutjong/mochi/commit/4ef2236d8d9900e6dbf17aa5f9fe46c1c4effaae))

### Tests

* **server:** cover every module to 100% lines and branches ([944f66f](https://github.com/edycutjong/mochi/commit/944f66f81887febc31abdb20e8c9239b915b9512))
* **server:** move the suite to vitest and measure coverage ([b3e900c](https://github.com/edycutjong/mochi/commit/b3e900ceb982bb3b782d95a291dd641492d53eff))
