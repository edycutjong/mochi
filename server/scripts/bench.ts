/**
 * Protocol benchmark.
 *
 * "Fast enough" is not a measurement, and a claim about latency that nobody can
 * reproduce is worth less than no claim at all. This produces the real thing:
 * percentile latency for every intent in the protocol, measured against the
 * real server, over a real WebSocket, writing to a real SQLite file.
 *
 * Nothing here is a harness the product does not have. It builds the same
 * `Room` over the same `Store` behind the same `createTransport` that
 * `src/index.ts` builds, and it talks to it with the `ws` client — no in-process
 * shortcut, no mocked transport, no rule switched off. In particular the rate
 * limiter stays exactly as it is in production: the workload is shaped to fit
 * inside the published per-wallet caps by using distinct wallets, because a
 * benchmark that has to disable a rule is measuring a server nobody runs.
 *
 * ## Determinism
 *
 * The *workload* is fixed: fixed wallet count, fixed intents per wallet, fixed
 * seed for every choice the script makes. Two runs perform byte-for-byte the
 * same sequence of messages against a byte-for-byte identical starting
 * database. Only the timings differ, because timings are what is being
 * measured. The script asserts nothing about them and exits 0 regardless — it
 * is an instrument, not a gate.
 *
 * ## The database
 *
 * Its own throwaway file, deleted before and after the run. Two guards, the
 * same two the development fixture uses, because a benchmark that appends two
 * and a half thousand synthetic acts to the real creature would be a permanent
 * lie about how many people cared for it:
 *   1. it refuses to run with NODE_ENV=production
 *   2. it writes to MOCHI_BENCH_DB_PATH (default ./data/bench.db) and refuses
 *      to share a path with MOCHI_DB_PATH or with the production default
 *
 * Run: npm run bench
 */

import { rmSync } from 'node:fs'
import { WebSocket, type RawData } from 'ws'

import { openDatabase } from '../src/db.js'
import { Store } from '../src/store.js'
import { Room } from '../src/game.js'
import { createTransport } from '../src/ws.js'
import { DEFAULTS, testConfig } from '../src/config.js'
import { TEACHABLE_EMOTE_IDS, type ClientMessage, type ServerMessage } from '../src/protocol.js'

// ---------------------------------------------------------------------------
// The workload. Every number here is fixed, and every number here is printed
// in the summary, so a reader can tell what the percentiles were computed over.
// ---------------------------------------------------------------------------

/** Fixed PRNG seed. The only source of choice in the script reads from it. */
const SEED = 0x4d4f4348 // 'MOCH'

/**
 * Intents per wallet, one row per kind.
 *
 * These are exactly the production per-minute caps in `DEFAULTS.limits`. One
 * wallet therefore spends its whole minute's allowance and stops, which is how
 * the benchmark stays inside the real rate limiter instead of turning it off.
 */
const PER_WALLET = DEFAULTS.limits

/** Intents one wallet contributes: 4 feed + 2 teach + 10 pet + 2 stamp. */
const INTENTS_PER_WALLET = PER_WALLET.feed + PER_WALLET.teach + PER_WALLET.pet + PER_WALLET.stamp

/** Wallets in the latency phase. 120 × 18 = 2,160 measured round trips. */
const LATENCY_WALLETS = 120

/** Wallets discarded before measuring, so JIT and SQLite page cache are warm. */
const WARMUP_WALLETS = 10

/**
 * Idle visitors connected throughout the latency phase.
 *
 * Every successful mutation broadcasts to every connection, so a measurement
 * taken against an empty room would be the one case that never happens in a
 * world built around other people being there. Four watchers is a plausible
 * evening in a one-parcel scene, and it puts their fan-out inside the measured
 * round trip rather than outside it.
 */
const OBSERVERS = 4

/** Concurrent clients in the throughput phase. */
const THROUGHPUT_WALLETS = 24

/** Samples per HTTP route. */
const HTTP_SAMPLES = 200

const EMOTES = [...TEACHABLE_EMOTE_IDS]

// ---------------------------------------------------------------------------

/** Deterministic PRNG. Same seed, same run, on any machine. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A distinct, well-formed wallet per index. Distinct wallets, distinct limits. */
function walletFor(index: number): string {
  return '0x' + index.toString(16).padStart(40, '0')
}

/**
 * The fixed intent sequence one wallet sends.
 *
 * Interleaved rather than grouped by kind, because a real visit is a feed, a
 * pet, a teach and a pet again — and the interleaving is what makes each
 * measurement fall on a different code path in the store.
 */
function intentsFor(random: () => number): ClientMessage[] {
  const out: ClientMessage[] = []
  for (let i = 0; i < PER_WALLET.pet; i++) out.push({ t: 'pet' })
  for (let i = 0; i < PER_WALLET.feed; i++) out.push({ t: 'feed' })
  for (let i = 0; i < PER_WALLET.teach; i++) {
    out.push({
      t: 'teach',
      emoteId: EMOTES[Math.floor(random() * EMOTES.length)]!,
      // A dressed dancer carries a handful of urns; an undressed one carries
      // none. Both shapes go over the wire during the run.
      wearables: Array.from({ length: Math.floor(random() * 5) }, (_, w) => `urn:bench:wearable:${w}`)
    })
  }
  for (let i = 0; i < PER_WALLET.stamp; i++) out.push({ t: 'stamp' })

  // Deterministic Fisher-Yates from the same stream, so the interleaving is
  // fixed rather than arbitrary.
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

function frameToText(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8')
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8')
  return data.toString('utf8')
}

/**
 * One benchmark client over a real socket.
 *
 * `next()` resolves on the next frame the server sends this connection, which
 * is what makes a round trip measurable: send at t0, resolve at t1.
 */
class BenchClient {
  private readonly socket: WebSocket
  private readonly pending: ((message: ServerMessage) => void)[] = []
  private readonly buffered: ServerMessage[] = []
  private target: { frames: number; resolve: () => void } | null = null
  /** Every frame this connection has been sent, including broadcasts. */
  received = 0

  private constructor(socket: WebSocket) {
    this.socket = socket
    this.socket.on('message', (data) => {
      this.received++
      const message = JSON.parse(frameToText(data)) as ServerMessage
      const waiter = this.pending.shift()
      if (waiter) waiter(message)
      else this.buffered.push(message)
      if (this.target && this.received >= this.target.frames) {
        const { resolve } = this.target
        this.target = null
        resolve()
      }
    })
  }

  static open(port: number): Promise<BenchClient> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}`)
      socket.once('error', reject)
      socket.once('open', () => resolve(new BenchClient(socket)))
    })
  }

  send(message: ClientMessage): void {
    this.socket.send(JSON.stringify(message))
  }

  next(): Promise<ServerMessage> {
    const buffered = this.buffered.shift()
    if (buffered) return Promise.resolve(buffered)
    return new Promise((resolve) => this.pending.push(resolve))
  }

  /** Send and wait for the reply it causes. Returns elapsed milliseconds. */
  async roundTrip(message: ClientMessage): Promise<number> {
    const started = performance.now()
    this.send(message)
    const reply = await this.next()
    const elapsed = performance.now() - started
    if (reply.t !== 'state') {
      throw new Error(`expected a state frame, got ${reply.t}:${'code' in reply ? reply.code : ''}`)
    }
    return elapsed
  }

  /**
   * Resolves once this connection has been sent `frames` frames in total.
   *
   * Driven by the message handler rather than by a poll, because a poll's own
   * timer resolution would be added to the throughput figure it is there to
   * measure.
   */
  waitFor(frames: number): Promise<void> {
    if (this.received >= frames) return Promise.resolve()
    return new Promise((resolve) => {
      this.target = { frames, resolve }
    })
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.socket.once('close', () => resolve())
      this.socket.close()
    })
  }
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

interface Summary {
  n: number
  p50: number
  p95: number
  p99: number
  max: number
  mean: number
}

/** Nearest-rank percentiles. No interpolation: every figure is a real sample. */
function summarise(samples: number[]): Summary {
  const sorted = [...samples].sort((a, b) => a - b)
  const at = (p: number): number => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]!
  return {
    n: sorted.length,
    p50: at(50),
    p95: at(95),
    p99: at(99),
    max: sorted[sorted.length - 1]!,
    mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length
  }
}

function ms(value: number): string {
  return `${value.toFixed(3)} ms`.padStart(11)
}

function row(label: string, summary: Summary): string {
  return (
    `  ${label.padEnd(22)}${String(summary.n).padStart(6)}  ` +
    `${ms(summary.p50)}${ms(summary.p95)}${ms(summary.p99)}${ms(summary.max)}`
  )
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') {
    console.error('refusing to run the benchmark with NODE_ENV=production')
    process.exit(1)
  }

  const dbPath = process.env['MOCHI_BENCH_DB_PATH']?.trim() || './data/bench.db'
  if (dbPath === process.env['MOCHI_DB_PATH']?.trim() || dbPath === DEFAULTS.dbPath) {
    console.error(`MOCHI_BENCH_DB_PATH must differ from the live database (${dbPath})`)
    process.exit(1)
  }

  // Start from nothing every time, or the percentiles would drift with however
  // many rows the last run happened to leave behind.
  const discard = (): void => {
    for (const suffix of ['', '-wal', '-shm']) rmSync(`${dbPath}${suffix}`, { force: true })
  }
  discard()

  const config = testConfig({ host: '127.0.0.1', port: 0, dbPath })
  const db = openDatabase({ path: dbPath })
  const store = new Store(db, config.hunger)
  const room = new Room(store, config)
  const transport = createTransport(room, config)
  const { port } = await transport.listen()

  const random = mulberry32(SEED)
  let wallet = 0

  // --- watchers ----------------------------------------------------------
  const observers: BenchClient[] = []
  for (let i = 0; i < OBSERVERS; i++) {
    const client = await BenchClient.open(port)
    await client.roundTrip({ t: 'hello', wallet: walletFor(wallet++), name: `BENCH_ONLY_watcher_${i}`, isGuest: false })
    observers.push(client)
  }

  // --- latency -----------------------------------------------------------
  const hello: number[] = []
  const byKind: Record<string, number[]> = { feed: [], teach: [], pet: [], stamp: [] }
  const allIntents: number[] = []

  for (let i = 0; i < WARMUP_WALLETS + LATENCY_WALLETS; i++) {
    const measured = i >= WARMUP_WALLETS
    const client = await BenchClient.open(port)
    const address = walletFor(wallet++)

    const handshake = await client.roundTrip({ t: 'hello', wallet: address, name: `BENCH_ONLY_${i}`, isGuest: false })
    if (measured) hello.push(handshake)

    for (const intent of intentsFor(random)) {
      const elapsed = await client.roundTrip(intent)
      if (measured) {
        byKind[intent.t]!.push(elapsed)
        allIntents.push(elapsed)
      }
    }
    await client.close()
  }

  const chainLength = store.chainLength()
  const chainInState = room.buildState().chain.length
  const carersInState = room.buildState().carers.length
  const stateBytes = Buffer.byteLength(JSON.stringify(room.buildState()))

  // --- throughput --------------------------------------------------------
  //
  // The latency phase is closed-loop: one intent in flight, so its numbers are
  // service time and not queueing. This phase is the other question — how many
  // intents the single process actually absorbs when a crowd taps at once, and
  // how many frames that costs, since every mutation is broadcast to everyone.
  const crowd: BenchClient[] = []
  for (let i = 0; i < THROUGHPUT_WALLETS; i++) {
    const client = await BenchClient.open(port)
    await client.roundTrip({ t: 'hello', wallet: walletFor(wallet++), name: `BENCH_ONLY_crowd_${i}`, isGuest: false })
    crowd.push(client)
  }

  const burst = crowd.map(() => intentsFor(random))
  const mutations = THROUGHPUT_WALLETS * INTENTS_PER_WALLET
  // hello reply + one broadcast per mutation from anybody in the room.
  const expectedFrames = 1 + mutations

  // The watchers have been receiving broadcasts since the latency phase, so
  // their part in this one is a delta rather than a total.
  const watchedBefore = new Map(observers.map((client) => [client, client.received]))

  const burstStarted = performance.now()
  crowd.forEach((client, i) => {
    for (const intent of burst[i]!) client.send(intent)
  })
  // Wait for the whole room, watchers included. Throughput here is not "the
  // taps were applied", it is "everybody present has been told".
  await Promise.all([
    ...crowd.map((client) => client.waitFor(expectedFrames)),
    ...observers.map((client) => client.waitFor(watchedBefore.get(client)! + mutations))
  ])
  const burstMs = performance.now() - burstStarted

  const connections = crowd.length + observers.length
  const framesDelivered =
    crowd.reduce((sum, client) => sum + client.received, 0) +
    observers.reduce((sum, client) => sum + client.received - watchedBefore.get(client)!, 0)
  await Promise.all(crowd.map((client) => client.close()))

  // --- HTTP --------------------------------------------------------------
  //
  // Measured after the write phases, so both routes are serialising a chain at
  // the protocol's own ceiling rather than an empty one.
  const stateSamples: number[] = []
  const healthSamples: number[] = []
  for (let i = 0; i < HTTP_SAMPLES; i++) {
    for (const [route, into] of [
      ['/state', stateSamples],
      ['/health', healthSamples]
    ] as const) {
      const started = performance.now()
      const response = await fetch(`http://127.0.0.1:${port}${route}`)
      await response.text()
      into.push(performance.now() - started)
    }
  }

  await Promise.all(observers.map((client) => client.close()))
  await transport.close()
  db.close()
  discard()

  // --- report ------------------------------------------------------------
  const intents = summarise(allIntents)
  const throughput = mutations / (burstMs / 1000)

  console.log(`
mochi protocol benchmark
────────────────────────────────────────────────────────────────────────────
  node                  ${process.version}
  seed                  0x${SEED.toString(16)} (fixed — the workload is identical on every run)
  database              ${dbPath} (created empty, deleted after)
  rate limiter          ON, production values — feed ${PER_WALLET.feed}/teach ${PER_WALLET.teach}/pet ${PER_WALLET.pet}/stamp ${PER_WALLET.stamp} per wallet per minute

  LATENCY — closed loop, one intent in flight, ${OBSERVERS} idle watchers connected
  ${LATENCY_WALLETS} wallets × ${INTENTS_PER_WALLET} intents, after ${WARMUP_WALLETS} discarded warm-up wallets
────────────────────────────────────────────────────────────────────────────
  intent                     n          p50         p95         p99         max
${row('hello (handshake)', summarise(hello))}
${row('feed', summarise(byKind['feed']!))}
${row('teach', summarise(byKind['teach']!))}
${row('pet', summarise(byKind['pet']!))}
${row('stamp', summarise(byKind['stamp']!))}
${row('ALL mutating intents', intents)}
                             mean ${intents.mean.toFixed(3)} ms

  THROUGHPUT — ${THROUGHPUT_WALLETS} concurrent wallets, every intent fired at once
────────────────────────────────────────────────────────────────────────────
  mutations applied     ${mutations}
  wall clock            ${burstMs.toFixed(1)} ms
  intents / second      ${throughput.toFixed(0)}
  connections in room   ${connections} (${THROUGHPUT_WALLETS} tapping, ${OBSERVERS} watching)
  frames delivered      ${framesDelivered} (every mutation is broadcast to every connection)

  HTTP — serialisation at the protocol's maximum chain
────────────────────────────────────────────────────────────────────────────
  chain rows in database ${chainLength}, of which ${chainInState} ride in a state message (MOCHI_CHAIN_LIMIT)
  carers in a state message ${carersInState}
  state payload         ${stateBytes} bytes
${row('GET /state', summarise(stateSamples))}
${row('GET /health', summarise(healthSamples))}
────────────────────────────────────────────────────────────────────────────
`)
}

main().catch((error: unknown) => {
  console.error('benchmark failed:', error)
  process.exit(1)
})
