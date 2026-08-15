import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { decayRatePerMs, hungerAfterFeed, hungerAt } from '../src/hunger.js'
import { DEFAULTS } from '../src/config.js'

const HOUR = 3_600_000
const config = { decayHours: DEFAULTS.decayHours, floor: DEFAULTS.floor, feedGain: DEFAULTS.feedGain }

describe('hunger decay', () => {
  test('a full belly is still full at the instant it was fed', () => {
    assert.equal(hungerAt(1, 0, 0, config), 1)
  })

  test('decays smoothly and monotonically over the window', () => {
    const samples = [0, 6, 12, 18, 24, 30, 36].map((h) => hungerAt(1, 0, h * HOUR, config))
    for (let i = 1; i < samples.length; i++) {
      assert.ok(samples[i]! < samples[i - 1]!, `sample ${i} should be lower than ${i - 1}`)
    }
  })

  test('reaches the floor at exactly the configured window', () => {
    const atWindow = hungerAt(1, 0, config.decayHours * HOUR, config)
    assert.ok(Math.abs(atWindow - config.floor) < 1e-9, `expected ${config.floor}, got ${atWindow}`)
  })

  test('halfway through the window it has lost half the distance to the floor', () => {
    const half = hungerAt(1, 0, 18 * HOUR, config)
    const expected = 1 - (1 - config.floor) / 2
    assert.ok(Math.abs(half - expected) < 1e-9, `expected ${expected}, got ${half}`)
  })

  test('never passes the floor, however long nobody visits', () => {
    for (const days of [2, 7, 30, 365, 10_000]) {
      const value = hungerAt(1, 0, days * 24 * HOUR, config)
      assert.equal(value, config.floor, `after ${days} days hunger should sit on the floor`)
      assert.ok(value > 0, 'hunger must never reach zero — needy, not dying')
    }
  })

  test('a floor of zero is still refused at the boundary: hunger is never negative', () => {
    const brutal = { ...config, floor: 0 }
    const value = hungerAt(1, 0, 1000 * 24 * HOUR, brutal)
    assert.equal(value, 0)
    assert.ok(value >= 0)
  })

  test('a clock that runs backwards cannot inflate hunger', () => {
    assert.equal(hungerAt(0.5, 10 * HOUR, 0, config), 0.5)
  })

  test('a stored value below the floor is corrected, not trusted', () => {
    assert.equal(hungerAt(-3, 0, 0, config), config.floor)
  })

  test('a stored value above one is clamped', () => {
    assert.equal(hungerAt(9, 0, 0, config), 1)
  })

  test('the decay rate takes a full belly to the floor in the configured hours', () => {
    const rate = decayRatePerMs(config)
    const travelled = rate * config.decayHours * HOUR
    assert.ok(Math.abs(travelled - (1 - config.floor)) < 1e-9)
  })
})

describe('feeding', () => {
  test('one feeding raises hunger by the configured gain', () => {
    assert.ok(Math.abs(hungerAfterFeed(0.5, config) - 0.7) < 1e-9)
  })

  test('feeding a full creature tops out at one rather than failing', () => {
    assert.equal(hungerAfterFeed(1, config), 1)
    assert.equal(hungerAfterFeed(0.95, config), 1)
  })

  test('feeding from the floor lifts it off the floor', () => {
    assert.ok(hungerAfterFeed(config.floor, config) > config.floor)
  })
})
