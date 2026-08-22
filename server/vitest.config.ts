import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Tests run against the TypeScript sources directly. The old runner
    // compiled to dist/ first and executed the output, which meant a stale
    // build could pass a suite the source would fail.
    include: ['test/**/*.test.ts'],

    // transport.test.ts opens a real WebSocket server on a fixed port and
    // persistence.test.ts writes SQLite files. Running suites in parallel
    // processes would have them fight over both, so files run one at a time.
    // The whole suite is well under a second — there is nothing to gain from
    // parallelism here, and a flaky port collision costs far more.
    fileParallelism: false,

    coverage: {
      provider: 'v8',
      // Only the server's own source is measured. Including the test files
      // inflates every number — they are 100% covered by definition, which is
      // how a 92% suite reports itself as 96%.
      include: ['src/**/*.ts'],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',

      // A ratchet, not an aspiration: these sit exactly where the suite
      // already is, so any regression fails the build. Never lower one to make
      // a build go green — fix the test.
      //
      // Nothing is excluded, including index.ts, the process bootstrap. Hiding
      // a file is the one way a coverage number becomes a lie, and index.ts
      // turned out to be testable anyway once its signal handlers and exit
      // path were driven directly.
      //
      // Functions is 98.27 rather than 100 because of exactly one uncovered
      // function: the `close` callback on the Sink passed to `room.connect()`
      // in src/ws.ts:63. It is unreachable because nothing in src/ ever calls
      // `sink.close()` — game.ts documents it as a hook for an unrecoverable
      // handshake error and then never uses it. That is dead code, and the
      // honest fix is to either wire it up or delete it, not to relax the
      // threshold further or exclude the file.
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 98,
        statements: 100,
      },
    },
  },
})
