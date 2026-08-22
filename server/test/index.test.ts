/**
 * The process bootstrap.
 *
 * `index.ts` runs `main()` at import time rather than exporting it, so the
 * only way to exercise it is to actually import it — with the environment
 * variables `loadConfig` reads set to a safe, ephemeral configuration
 * (`127.0.0.1`, port `0`, an in-memory database) and `process.exit` stubbed
 * so a real shutdown never takes the test runner down with it. Each test
 * imports the module fresh (a cache-busting query string forces Vite to
 * re-evaluate the file) so the two scenarios — a clean boot/shutdown and a
 * startup failure — don't share module state.
 */

import { afterEach, describe, test, vi } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const MOCHI_ENV_KEYS = ['MOCHI_HOST', 'MOCHI_PORT', 'MOCHI_DB_PATH'] as const

let importCounter = 0

/** A fresh module instance each call, so `main()` runs again from scratch. */
function importIndex(): Promise<unknown> {
  importCounter += 1
  return import(/* @vite-ignore */ `../src/index.js?case=${importCounter}`)
}

describe('process bootstrap', () => {
  afterEach(() => {
    for (const key of MOCHI_ENV_KEYS) delete process.env[key]
    process.removeAllListeners('SIGINT')
    process.removeAllListeners('SIGTERM')
    vi.restoreAllMocks()
  })

  test('boots on the configured host and port, logs the listening line, and shuts down cleanly on SIGINT', async () => {
    process.env.MOCHI_HOST = '127.0.0.1'
    process.env.MOCHI_PORT = '0'
    process.env.MOCHI_DB_PATH = ':memory:'

    const logs: unknown[][] = []
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args)
    })
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    await importIndex()

    await vi.waitFor(
      () => {
        assert.ok(
          logs.some((line) => typeof line[0] === 'string' && line[0].includes('mochi-server listening on 127.0.0.1:')),
          'expected the listening line once the transport has bound'
        )
      },
      { timeout: 4000, interval: 20 }
    )

    process.emit('SIGINT', 'SIGINT')

    await vi.waitFor(
      () => {
        assert.ok(
          logs.some((line) => typeof line[0] === 'string' && line[0].includes('received SIGINT, shutting down')),
          'expected the shutdown handler to log the signal it received'
        )
        assert.equal(exitSpy.mock.calls.length, 1, 'expected a clean shutdown to exit exactly once')
        assert.deepEqual(exitSpy.mock.calls[0], [0], 'expected a clean shutdown to exit with code 0')
      },
      { timeout: 4000, interval: 20 }
    )

    // A signal that arrives after shutdown is already under way (a duplicate
    // SIGINT, or SIGTERM right behind it) must be a no-op: the `closing`
    // guard exists precisely so the database is never closed twice.
    process.emit('SIGTERM', 'SIGTERM')
    await new Promise((resolve) => setTimeout(resolve, 50))
    assert.equal(exitSpy.mock.calls.length, 1, 'a second signal must not trigger a second shutdown')
    assert.ok(
      !logs.some((line) => typeof line[0] === 'string' && line[0].includes('received SIGTERM')),
      'the closing guard should have swallowed the second signal before it logged anything'
    )
  })

  test('logs the error and exits with a failure code when startup fails', async () => {
    // A directory in place of a database file: node:sqlite refuses to open
    // it, so `openDatabase` throws synchronously inside `main()` — the
    // simplest reliable way to exercise the `main().catch(...)` path without
    // touching src.
    const dir = mkdtempSync(join(tmpdir(), 'mochi-index-fail-'))

    process.env.MOCHI_HOST = '127.0.0.1'
    process.env.MOCHI_PORT = '0'
    process.env.MOCHI_DB_PATH = dir

    vi.spyOn(console, 'log').mockImplementation(() => {})
    const errors: unknown[][] = []
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args)
    })
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    try {
      await importIndex()

      await vi.waitFor(
        () => {
          assert.equal(exitSpy.mock.calls.length, 1, 'expected the failure path to exit exactly once')
        },
        { timeout: 4000, interval: 20 }
      )

      assert.deepEqual(exitSpy.mock.calls[0], [1], 'expected a startup failure to exit with code 1')
      assert.equal(errors.length, 1, 'expected one error to be logged')
      assert.equal(errors[0]?.[0], 'mochi-server failed to start:', 'expected the failure to be labelled')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
