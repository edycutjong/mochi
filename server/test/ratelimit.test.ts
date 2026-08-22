import { test, describe } from 'vitest'
import assert from 'node:assert/strict'

import { RateLimiter } from '../src/ratelimit.js'
import { RATE_LIMIT_WINDOW_MS, type RateLimits } from '../src/config.js'

const limits: RateLimits = { feed: 3, teach: 2, pet: 5, stamp: 1 }
const WALLET = '0x' + 'a1'.repeat(20)
const OTHER = '0x' + 'b2'.repeat(20)

describe('rate limiter', () => {
  test('allows exactly the configured number of messages in a window', () => {
    const limiter = new RateLimiter(limits)
    for (let i = 0; i < limits.feed; i++) {
      assert.equal(limiter.check(WALLET, 'feed', 1000 + i).allowed, true, `message ${i} should pass`)
    }
    assert.equal(limiter.check(WALLET, 'feed', 1000 + limits.feed).allowed, false)
  })

  test('reports when the next message will be accepted', () => {
    const limiter = new RateLimiter(limits)
    limiter.check(WALLET, 'stamp', 5_000)
    const verdict = limiter.check(WALLET, 'stamp', 6_000)
    assert.equal(verdict.allowed, false)
    assert.equal(verdict.allowed === false && verdict.retryAt, 5_000 + RATE_LIMIT_WINDOW_MS)
  })

  test('the window slides: capacity returns as old hits age out', () => {
    const limiter = new RateLimiter(limits)
    limiter.check(WALLET, 'teach', 0)
    limiter.check(WALLET, 'teach', 1_000)
    assert.equal(limiter.check(WALLET, 'teach', 2_000).allowed, false)

    // The first hit has now left the window; exactly one slot opens up.
    assert.equal(limiter.check(WALLET, 'teach', RATE_LIMIT_WINDOW_MS + 1).allowed, true)
    assert.equal(limiter.check(WALLET, 'teach', RATE_LIMIT_WINDOW_MS + 2).allowed, false)
  })

  test('a burst across a boundary cannot land at twice the limit', () => {
    const limiter = new RateLimiter(limits)
    // Fill the window at the very end of "minute one".
    for (let i = 0; i < limits.feed; i++) limiter.check(WALLET, 'feed', 59_000 + i)
    // A fixed bucket would reset here. A sliding window must not.
    assert.equal(limiter.check(WALLET, 'feed', 60_100).allowed, false)
  })

  test('limits are per wallet — one griefer cannot lock out everyone else', () => {
    const limiter = new RateLimiter(limits)
    for (let i = 0; i < limits.feed; i++) limiter.check(WALLET, 'feed', 1000 + i)
    assert.equal(limiter.check(WALLET, 'feed', 2000).allowed, false)
    assert.equal(limiter.check(OTHER, 'feed', 2000).allowed, true)
  })

  test('limits are per kind — exhausting feed leaves petting available', () => {
    const limiter = new RateLimiter(limits)
    for (let i = 0; i < limits.feed; i++) limiter.check(WALLET, 'feed', 1000 + i)
    assert.equal(limiter.check(WALLET, 'feed', 2000).allowed, false)
    assert.equal(limiter.check(WALLET, 'pet', 2000).allowed, true)
  })

  test('a refused message does not extend the wait', () => {
    const limiter = new RateLimiter(limits)
    limiter.check(WALLET, 'stamp', 1_000)
    for (let i = 0; i < 50; i++) limiter.check(WALLET, 'stamp', 2_000 + i)

    const verdict = limiter.check(WALLET, 'stamp', 3_000)
    assert.equal(verdict.allowed === false && verdict.retryAt, 1_000 + RATE_LIMIT_WINDOW_MS)
    assert.equal(limiter.check(WALLET, 'stamp', 1_000 + RATE_LIMIT_WINDOW_MS + 1).allowed, true)
  })

  test('a limit of zero refuses everything', () => {
    const limiter = new RateLimiter({ feed: 0, teach: 0, pet: 0, stamp: 0 })
    assert.equal(limiter.check(WALLET, 'feed', 0).allowed, false)
  })

  test('quiet wallets are eventually forgotten, so uptime does not leak memory', () => {
    const limiter = new RateLimiter(limits)
    limiter.check(WALLET, 'feed', 0)
    assert.equal(limiter.size, 1)
    limiter.check(OTHER, 'feed', 100 * RATE_LIMIT_WINDOW_MS)
    assert.equal(limiter.size, 1, 'the idle wallet should have been swept')
  })

  test('a sweep tolerates a tracked key whose hits are already empty', () => {
    // A zero limit always refuses, so the key is recorded with an empty hit
    // list (never pushed to). A later sweep must still be able to look up
    // "the newest hit" for that key without one to find.
    const limiter = new RateLimiter({ feed: 0, teach: 2, pet: 5, stamp: 1 })
    limiter.check(WALLET, 'feed', 0)
    assert.equal(limiter.size, 1)
    limiter.check(WALLET, 'teach', RATE_LIMIT_WINDOW_MS)
    assert.equal(limiter.size, 2, 'the empty-hit key should survive a sweep that is not yet idle enough to evict it')
  })
})
