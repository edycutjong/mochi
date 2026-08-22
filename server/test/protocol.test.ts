/**
 * `protocol.ts` is the boundary between the network and the game logic: every
 * message that reaches `parseClientMessage` is untrusted JSON from a mobile
 * scene client. The valuable tests here are the hostile ones — wrong types,
 * missing fields, oversized strings, wrong-shaped arrays, prototype-pollution
 * keys — because a validator that has only ever seen valid input is untested.
 */

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  isMutating,
  parseClientMessage,
  MAX_EMOTE_ID_LENGTH,
  MAX_NAME_LENGTH,
  MAX_WEARABLES,
  MAX_WEARABLE_LENGTH,
  MUTATING_KINDS
} from '../src/protocol.js'
import type { ClientMessage, HelloMessage } from '../src/protocol.js'

describe('parseClientMessage — top-level shape', () => {
  const notAnObject = [
    null,
    undefined,
    'hello',
    42,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    true,
    false,
    [],
    ['t', 'hello'],
    [{ t: 'hello' }]
  ]

  for (const raw of notAnObject) {
    test(`rejects a raw value that is not a plain object: ${JSON.stringify(raw)}`, () => {
      assert.equal(parseClientMessage(raw), null)
    })
  }

  test('rejects an object with no discriminator at all', () => {
    assert.equal(parseClientMessage({}), null)
  })

  test('rejects a discriminator that is not a known kind', () => {
    assert.equal(parseClientMessage({ t: 'nuke' }), null)
  })

  test('rejects a discriminator of the wrong type', () => {
    assert.equal(parseClientMessage({ t: 42 }), null)
    assert.equal(parseClientMessage({ t: null }), null)
    assert.equal(parseClientMessage({ t: undefined }), null)
    assert.equal(parseClientMessage({ t: ['hello'] }), null)
    assert.equal(parseClientMessage({ t: { toString: () => 'hello' } }), null)
  })

  test('a prototype-pollution key rides along as an ordinary own property, not a pollution vector', () => {
    // JSON.parse gives `__proto__` a real own data property rather than
    // triggering the accessor — but an object *literal* with a `__proto__`
    // key sets the prototype instead. Exercise both shapes and confirm
    // neither corrupts Object.prototype nor breaks parsing.
    const viaJson = JSON.parse('{"t":"feed","__proto__":{"polluted":true}}') as unknown
    const result = parseClientMessage(viaJson)
    assert.deepEqual(result, { t: 'feed' })
    assert.equal(({} as Record<string, unknown>)['polluted'], undefined)

    const viaLiteral = { t: 'feed', ['__proto__']: { polluted: true } }
    assert.deepEqual(parseClientMessage(viaLiteral), { t: 'feed' })
    assert.equal(({} as Record<string, unknown>)['polluted'], undefined)
  })

  test('extra unknown fields on an otherwise-valid message are silently ignored', () => {
    const result = parseClientMessage({ t: 'pet', extra: 'field', another: 123, nested: { x: 1 } })
    assert.deepEqual(result, { t: 'pet' })
  })
})

describe('parseClientMessage — hello', () => {
  test('accepts a well-formed hello and normalises whitespace', () => {
    const result = parseClientMessage({ t: 'hello', wallet: '  0xABC123  ', name: '  Alice  ', isGuest: false })
    assert.deepEqual(result, { t: 'hello', wallet: '0xABC123', name: 'Alice', isGuest: false })
  })

  test('isGuest is true only when the field is the literal boolean true', () => {
    const base = { t: 'hello', wallet: 'w', name: 'n' }
    assert.equal((parseClientMessage({ ...base, isGuest: true }) as HelloMessage).isGuest, true)
    assert.equal((parseClientMessage({ ...base, isGuest: false }) as HelloMessage).isGuest, false)
    assert.equal((parseClientMessage({ ...base }) as HelloMessage).isGuest, false)
    assert.equal((parseClientMessage({ ...base, isGuest: 'true' }) as HelloMessage).isGuest, false)
    assert.equal((parseClientMessage({ ...base, isGuest: 1 }) as HelloMessage).isGuest, false)
    assert.equal((parseClientMessage({ ...base, isGuest: null }) as HelloMessage).isGuest, false)
  })

  const badWallets = [
    ['missing entirely', undefined],
    ['null', null],
    ['a number', 42],
    ['a boolean', true],
    ['an object', { addr: '0x1' }],
    ['an array', ['0x1']],
    ['an empty string', ''],
    ['only whitespace', '   '],
    ['exactly 129 characters (one over the cap)', 'a'.repeat(129)]
  ] as const

  for (const [label, wallet] of badWallets) {
    test(`refuses a hello whose wallet is ${label}`, () => {
      assert.equal(parseClientMessage({ t: 'hello', wallet, name: 'Alice', isGuest: false }), null)
    })
  }

  test('accepts a wallet at exactly the 128-character cap', () => {
    const wallet = 'a'.repeat(128)
    const result = parseClientMessage({ t: 'hello', wallet, name: 'Alice', isGuest: false })
    assert.deepEqual(result, { t: 'hello', wallet, name: 'Alice', isGuest: false })
  })

  const badNames = [
    ['missing entirely', undefined],
    ['null', null],
    ['a number', 7],
    ['a boolean', false],
    ['an object', { first: 'Alice' }],
    ['an array', ['Alice']]
  ] as const

  for (const [label, name] of badNames) {
    test(`refuses a hello whose name field is ${label} (wrong shape, not merely empty)`, () => {
      assert.equal(parseClientMessage({ t: 'hello', wallet: 'w', name, isGuest: false }), null)
    })
  }

  test('an empty or whitespace-only name is a semantic refusal, not a parse failure — it survives', () => {
    assert.deepEqual(parseClientMessage({ t: 'hello', wallet: 'w', name: '', isGuest: false }), {
      t: 'hello',
      wallet: 'w',
      name: '',
      isGuest: false
    })
    assert.deepEqual(parseClientMessage({ t: 'hello', wallet: 'w', name: '   ', isGuest: false }), {
      t: 'hello',
      wallet: 'w',
      name: '',
      isGuest: false
    })
  })

  test('a name over the cap is truncated, not refused', () => {
    const longName = 'x'.repeat(MAX_NAME_LENGTH + 50)
    const result = parseClientMessage({ t: 'hello', wallet: 'w', name: longName, isGuest: false }) as HelloMessage
    assert.equal(result.name.length, MAX_NAME_LENGTH)
    assert.equal(result.name, 'x'.repeat(MAX_NAME_LENGTH))
  })

  test('a name padded with whitespace past the cap is trimmed before it is measured against the cap', () => {
    const padded = `  ${'y'.repeat(MAX_NAME_LENGTH)}  `
    const result = parseClientMessage({ t: 'hello', wallet: 'w', name: padded, isGuest: false }) as HelloMessage
    assert.equal(result.name, 'y'.repeat(MAX_NAME_LENGTH))
  })
})

describe('parseClientMessage — teach', () => {
  test('accepts a well-formed teach with several wearables', () => {
    const result = parseClientMessage({
      t: 'teach',
      emoteId: 'wave',
      wearables: ['urn:one', ' urn:two ']
    })
    assert.deepEqual(result, { t: 'teach', emoteId: 'wave', wearables: ['urn:one', 'urn:two'] })
  })

  test('accepts a teach with zero wearables', () => {
    const result = parseClientMessage({ t: 'teach', emoteId: 'wave', wearables: [] })
    assert.deepEqual(result, { t: 'teach', emoteId: 'wave', wearables: [] })
  })

  const badEmoteIds = [
    ['missing entirely', undefined],
    ['null', null],
    ['a number', 5],
    ['an array', ['wave']],
    ['an object', { id: 'wave' }],
    ['an empty string', ''],
    ['only whitespace', '   '],
    [`over ${MAX_EMOTE_ID_LENGTH} characters`, 'e'.repeat(MAX_EMOTE_ID_LENGTH + 1)]
  ] as const

  for (const [label, emoteId] of badEmoteIds) {
    test(`refuses a teach whose emoteId is ${label}`, () => {
      assert.equal(parseClientMessage({ t: 'teach', emoteId, wearables: [] }), null)
    })
  }

  test('accepts an emoteId at exactly the length cap', () => {
    const emoteId = 'e'.repeat(MAX_EMOTE_ID_LENGTH)
    const result = parseClientMessage({ t: 'teach', emoteId, wearables: [] })
    assert.deepEqual(result, { t: 'teach', emoteId, wearables: [] })
  })

  const badWearableContainers = [
    ['missing entirely', undefined],
    ['null', null],
    ['a single string (not an array)', 'urn:one'],
    ['an object', { 0: 'urn:one' }],
    ['a number', 4]
  ] as const

  for (const [label, wearables] of badWearableContainers) {
    test(`refuses a teach whose wearables field is ${label}`, () => {
      assert.equal(parseClientMessage({ t: 'teach', emoteId: 'wave', wearables }), null)
    })
  }

  test('non-string wearable entries are dropped, not rejected wholesale', () => {
    const result = parseClientMessage({
      t: 'teach',
      emoteId: 'wave',
      wearables: ['urn:good', 42, null, undefined, {}, [], 'urn:also-good']
    })
    assert.deepEqual(result, { t: 'teach', emoteId: 'wave', wearables: ['urn:good', 'urn:also-good'] })
  })

  test('empty-string and whitespace-only wearable entries are dropped', () => {
    const result = parseClientMessage({
      t: 'teach',
      emoteId: 'wave',
      wearables: ['urn:good', '', '   ']
    })
    assert.deepEqual(result, { t: 'teach', emoteId: 'wave', wearables: ['urn:good'] })
  })

  test('an oversized wearable urn is dropped, not truncated', () => {
    const tooLong = 'u'.repeat(MAX_WEARABLE_LENGTH + 1)
    const okLength = 'u'.repeat(MAX_WEARABLE_LENGTH)
    const result = parseClientMessage({
      t: 'teach',
      emoteId: 'wave',
      wearables: [tooLong, okLength]
    })
    assert.deepEqual(result, { t: 'teach', emoteId: 'wave', wearables: [okLength] })
  })

  test('wearables beyond MAX_WEARABLES are never even inspected, valid or not', () => {
    const wearables = Array.from({ length: MAX_WEARABLES + 10 }, (_, i) => `urn:${i}`)
    const result = parseClientMessage({ t: 'teach', emoteId: 'wave', wearables }) as {
      wearables: string[]
    }
    assert.equal(result.wearables.length, MAX_WEARABLES)
    assert.deepEqual(result.wearables, wearables.slice(0, MAX_WEARABLES))
  })

  test('a valid urn that sits past the MAX_WEARABLES cut is excluded even though it is well-formed', () => {
    const wearables = [...Array.from({ length: MAX_WEARABLES }, (_, i) => `urn:${i}`), 'urn:late-and-valid']
    const result = parseClientMessage({ t: 'teach', emoteId: 'wave', wearables }) as {
      wearables: string[]
    }
    assert.ok(!result.wearables.includes('urn:late-and-valid'))
    assert.equal(result.wearables.length, MAX_WEARABLES)
  })
})

describe('parseClientMessage — no-payload intents', () => {
  test('feed parses with no other fields required', () => {
    assert.deepEqual(parseClientMessage({ t: 'feed' }), { t: 'feed' })
  })

  test('pet parses with no other fields required', () => {
    assert.deepEqual(parseClientMessage({ t: 'pet' }), { t: 'pet' })
  })

  test('stamp parses with no other fields required', () => {
    assert.deepEqual(parseClientMessage({ t: 'stamp' }), { t: 'stamp' })
  })
})

describe('isMutating', () => {
  test('hello is the one message that is not mutating', () => {
    const hello: ClientMessage = { t: 'hello', wallet: 'w', name: 'n', isGuest: false }
    assert.equal(isMutating(hello), false)
  })

  for (const kind of MUTATING_KINDS) {
    test(`${kind} is classified as a mutating intent`, () => {
      const message = { t: kind } as ClientMessage
      assert.equal(isMutating(message), true)
    })
  }

  test('MUTATING_KINDS matches every ClientMessage variant except hello', () => {
    assert.deepEqual([...MUTATING_KINDS].sort(), ['feed', 'pet', 'stamp', 'teach'])
  })
})
