import { test, describe, beforeEach, afterAll } from 'vitest'
import assert from 'node:assert/strict'

import { DEFAULTS, loadConfig, limitFor, testConfig } from '../src/config.js'

// config.ts reads process.env at call time, so every test that touches an
// env var restores the exact snapshot afterwards — order-independence is the
// whole point of that file existing.
const ORIGINAL_ENV = { ...process.env }
const CONFIG_KEYS = [
  'MOCHI_HOST',
  'MOCHI_PORT',
  'MOCHI_DB_PATH',
  'MOCHI_HUNGER_DECAY_HOURS',
  'MOCHI_HUNGER_FLOOR',
  'MOCHI_FEED_GAIN',
  'MOCHI_LIMIT_FEED',
  'MOCHI_LIMIT_TEACH',
  'MOCHI_LIMIT_PET',
  'MOCHI_LIMIT_STAMP',
  'MOCHI_CHAIN_LIMIT',
  'MOCHI_CARER_WINDOW_HOURS'
]

beforeEach(() => {
  for (const key of CONFIG_KEYS) delete process.env[key]
})

afterAll(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key]
  }
  Object.assign(process.env, ORIGINAL_ENV)
})

describe('loadConfig defaults', () => {
  test('falls back to every default when no environment variable is set', () => {
    const config = loadConfig()
    assert.equal(config.host, DEFAULTS.host)
    assert.equal(config.port, DEFAULTS.port)
    assert.equal(config.dbPath, DEFAULTS.dbPath)
    assert.deepEqual(config.hunger, {
      decayHours: DEFAULTS.decayHours,
      floor: DEFAULTS.floor,
      feedGain: DEFAULTS.feedGain
    })
    assert.deepEqual(config.limits, DEFAULTS.limits)
    assert.equal(config.chainLimit, DEFAULTS.chainLimit)
    assert.equal(config.carerWindowHours, DEFAULTS.carerWindowHours)
  })

  test('falls back when a variable is set to whitespace only', () => {
    process.env.MOCHI_HOST = '   '
    process.env.MOCHI_PORT = '  '
    process.env.MOCHI_HUNGER_FLOOR = '\t'
    const config = loadConfig()
    assert.equal(config.host, DEFAULTS.host)
    assert.equal(config.port, DEFAULTS.port)
    assert.equal(config.hunger.floor, DEFAULTS.floor)
  })
})

describe('loadConfig with valid overrides', () => {
  test('reads every string, int, and float variable that is set', () => {
    process.env.MOCHI_HOST = '192.168.1.1'
    process.env.MOCHI_PORT = '3000'
    process.env.MOCHI_DB_PATH = './custom.db'
    process.env.MOCHI_HUNGER_DECAY_HOURS = '48'
    process.env.MOCHI_HUNGER_FLOOR = '0.3'
    process.env.MOCHI_FEED_GAIN = '0.5'
    process.env.MOCHI_LIMIT_FEED = '9'
    process.env.MOCHI_LIMIT_TEACH = '8'
    process.env.MOCHI_LIMIT_PET = '7'
    process.env.MOCHI_LIMIT_STAMP = '6'
    process.env.MOCHI_CHAIN_LIMIT = '99'
    process.env.MOCHI_CARER_WINDOW_HOURS = '72'

    const config = loadConfig()

    assert.equal(config.host, '192.168.1.1')
    assert.equal(config.port, 3000)
    assert.equal(config.dbPath, './custom.db')
    assert.equal(config.hunger.decayHours, 48)
    assert.equal(config.hunger.floor, 0.3)
    assert.equal(config.hunger.feedGain, 0.5)
    assert.deepEqual(config.limits, { feed: 9, teach: 8, pet: 7, stamp: 6 })
    assert.equal(config.chainLimit, 99)
    assert.equal(config.carerWindowHours, 72)
  })

  test('trims surrounding whitespace from a string variable', () => {
    process.env.MOCHI_DB_PATH = '  ./padded.db  '
    const config = loadConfig()
    assert.equal(config.dbPath, './padded.db')
  })
})

describe('loadConfig with unparseable values', () => {
  test('falls back to the default int when the variable is not a number', () => {
    process.env.MOCHI_PORT = 'not-a-port'
    process.env.MOCHI_CHAIN_LIMIT = 'nope'
    const config = loadConfig()
    assert.equal(config.port, DEFAULTS.port)
    assert.equal(config.chainLimit, DEFAULTS.chainLimit)
  })

  test('falls back to the default float when the variable is not a number', () => {
    process.env.MOCHI_HUNGER_DECAY_HOURS = 'garbage'
    process.env.MOCHI_FEED_GAIN = 'garbage'
    const config = loadConfig()
    assert.equal(config.hunger.decayHours, DEFAULTS.decayHours)
    assert.equal(config.hunger.feedGain, DEFAULTS.feedGain)
  })

  test('falls back to the default when the numeric variable is infinite', () => {
    process.env.MOCHI_HUNGER_FLOOR = 'Infinity'
    const config = loadConfig()
    assert.equal(config.hunger.floor, DEFAULTS.floor)
  })
})

describe('loadConfig clamping', () => {
  test('clamps a hunger floor above the ceiling down to 0.95', () => {
    process.env.MOCHI_HUNGER_FLOOR = '5'
    const config = loadConfig()
    assert.equal(config.hunger.floor, 0.95)
  })

  test('clamps a negative hunger floor up to zero', () => {
    process.env.MOCHI_HUNGER_FLOOR = '-2'
    const config = loadConfig()
    assert.equal(config.hunger.floor, 0)
  })

  test('leaves an in-range hunger floor untouched', () => {
    process.env.MOCHI_HUNGER_FLOOR = '0.5'
    const config = loadConfig()
    assert.equal(config.hunger.floor, 0.5)
  })

  test('clamps a decay window below the minimum up to 0.01 hours', () => {
    process.env.MOCHI_HUNGER_DECAY_HOURS = '0'
    const config = loadConfig()
    assert.equal(config.hunger.decayHours, 0.01)
  })

  test('clamps a negative feed gain up to zero', () => {
    process.env.MOCHI_FEED_GAIN = '-1'
    const config = loadConfig()
    assert.equal(config.hunger.feedGain, 0)
  })

  test('clamps a chain limit below one up to one', () => {
    process.env.MOCHI_CHAIN_LIMIT = '0'
    const config = loadConfig()
    assert.equal(config.chainLimit, 1)
  })

  test('clamps a carer window below one up to one', () => {
    process.env.MOCHI_CARER_WINDOW_HOURS = '-10'
    const config = loadConfig()
    assert.equal(config.carerWindowHours, 1)
  })
})

describe('testConfig', () => {
  test('produces an in-memory, localhost config with the default tunables', () => {
    const config = testConfig()
    assert.equal(config.host, '127.0.0.1')
    assert.equal(config.port, 0)
    assert.equal(config.dbPath, ':memory:')
    assert.deepEqual(config.hunger, {
      decayHours: DEFAULTS.decayHours,
      floor: DEFAULTS.floor,
      feedGain: DEFAULTS.feedGain
    })
    assert.deepEqual(config.limits, DEFAULTS.limits)
    assert.equal(config.chainLimit, DEFAULTS.chainLimit)
    assert.equal(config.carerWindowHours, DEFAULTS.carerWindowHours)
  })

  test('lets a caller override individual fields without touching the rest', () => {
    const config = testConfig({ port: 4321, dbPath: './override.db' })
    assert.equal(config.port, 4321)
    assert.equal(config.dbPath, './override.db')
    assert.equal(config.host, '127.0.0.1')
  })
})

describe('limitFor', () => {
  test('looks up the configured cap for each mutating kind', () => {
    const limits = { feed: 1, teach: 2, pet: 3, stamp: 4 }
    assert.equal(limitFor(limits, 'feed'), 1)
    assert.equal(limitFor(limits, 'teach'), 2)
    assert.equal(limitFor(limits, 'pet'), 3)
    assert.equal(limitFor(limits, 'stamp'), 4)
  })
})
