/**
 * Mochi — shared truth for the landing page.
 *
 * Everything in this file is either (a) a constant copied verbatim from the
 * scene/server source in ../../build, or (b) a clearly-marked placeholder.
 * Nothing here is invented marketing copy.
 */

/* ============================================================================
   PLACEHOLDERS — the only unresolved facts on the page.
   ----------------------------------------------------------------------------
   Both are rendered visibly as «PENDING:…» tokens so nobody can mistake a
   placeholder for a real value. Filling either in is a ONE-LINE change here;
   no component needs touching.
   ============================================================================ */

/** The Decentraland World URL. Null until DCL Regenesis Labs grants the World. */
export const WORLD_URL: string | null = null;
export const WORLD_URL_PENDING = "«PENDING:world-url»";

/** Scene performance score. Not yet measured on the target device. */
export const PERF_SCORE: string | null = null;
export const PERF_SCORE_PENDING = "«PENDING:perf-score»";

export const REPO_URL = "https://github.com/edycutjong/mochi";

/**
 * The page written for someone verifying in a hurry — every number and how to
 * check it. Linking the repo root instead makes a judge go hunting for it,
 * which is the opposite of the point.
 */
export const JUDGE_URL = `${REPO_URL}/blob/main/JUDGE.md`;
export const STATE_ENDPOINT = "https://mochi-friendzone.fly.dev/state";

/** True once a real World exists — drives CTA copy and enabled/disabled state. */
export const worldIsLive = WORLD_URL !== null;

/* ============================================================================
   SCENE CONSTANTS — copied from build/src/config.ts and build/server/src/config.ts
   ============================================================================ */

/** build/src/config.ts → GROWTH */
export const GROWTH = {
  baseScale: 1.0,
  perFeed: 0.012,
  maxScale: 1.9,
} as const;

/** build/server/src/config.ts → hunger defaults */
export const HUNGER = {
  decayHours: 36,
  floor: 0.15,
  feedGain: 0.2,
} as const;

/**
 * build/src/mochi/creature.ts:126 — the literal growth rule.
 * scale = min(baseScale + feedCount * perFeed, maxScale)
 */
export function scaleForFeedCount(feedCount: number): number {
  return Math.min(
    GROWTH.baseScale + feedCount * GROWTH.perFeed,
    GROWTH.maxScale,
  );
}

/** How many more feedings until the creature reaches its maximum size. */
export function feedsUntilMax(feedCount: number): number {
  const max = Math.round((GROWTH.maxScale - GROWTH.baseScale) / GROWTH.perFeed);
  return Math.max(0, max - feedCount);
}

/**
 * build/src/mochi/plaque.ts:71-79 — the exact relative-time wording the plaque
 * uses in-world. Lowercase, because that is how the scene renders it.
 */
export function ago(fromMs: number, nowMs: number): string {
  const delta = Math.max(0, nowMs - fromMs);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

/* ============================================================================
   LIVE STATE — the shape the real Fly.io server returns.
   ============================================================================ */

export interface ChainMove {
  seq: number;
  emoteId: string;
  teacherName: string;
  wearables: string[];
  taughtAt: number;
  isSeed: boolean;
}

export interface MochiState {
  t: string;
  now: number;
  pet: {
    hunger: number;
    feedCount: number;
    lastFedAt: number;
    lastFedBy: string;
  };
  chain: ChainMove[];
  carers: string[];
  chainLength: number;
  carerCount: number;
}

/** Narrow an unknown JSON payload to MochiState without trusting the network. */
export function parseState(input: unknown): MochiState | null {
  if (typeof input !== "object" || input === null) return null;
  const raw = input as Record<string, unknown>;
  const pet = raw.pet as Record<string, unknown> | undefined;
  if (!pet || typeof pet.feedCount !== "number") return null;

  const chain = Array.isArray(raw.chain)
    ? (raw.chain as unknown[]).flatMap((entry) => {
        if (typeof entry !== "object" || entry === null) return [];
        const move = entry as Record<string, unknown>;
        if (typeof move.seq !== "number") return [];
        return [
          {
            seq: move.seq,
            emoteId: typeof move.emoteId === "string" ? move.emoteId : "move",
            teacherName:
              typeof move.teacherName === "string" ? move.teacherName : "",
            wearables: Array.isArray(move.wearables)
              ? (move.wearables as unknown[]).filter(
                  (w): w is string => typeof w === "string",
                )
              : [],
            taughtAt: typeof move.taughtAt === "number" ? move.taughtAt : 0,
            isSeed: move.isSeed === true,
          } satisfies ChainMove,
        ];
      })
    : [];

  return {
    t: typeof raw.t === "string" ? raw.t : "state",
    now: typeof raw.now === "number" ? raw.now : Date.now(),
    pet: {
      hunger: typeof pet.hunger === "number" ? pet.hunger : HUNGER.floor,
      feedCount: pet.feedCount,
      lastFedAt: typeof pet.lastFedAt === "number" ? pet.lastFedAt : 0,
      lastFedBy: typeof pet.lastFedBy === "string" ? pet.lastFedBy : "",
    },
    chain,
    carers: Array.isArray(raw.carers)
      ? (raw.carers as unknown[]).filter((c): c is string => typeof c === "string")
      : [],
    chainLength:
      typeof raw.chainLength === "number" ? raw.chainLength : chain.length,
    carerCount: typeof raw.carerCount === "number" ? raw.carerCount : 0,
  };
}

/**
 * The 12 moves the in-world emote picker offers.
 * build/src/ui/emote-picker.tsx:19-32
 */
export const EMOTE_LABELS: Record<string, string> = {
  wave: "wave",
  clap: "clap",
  dance: "dance",
  raise: "raise",
  pump: "pump",
  robot: "robot",
  kiss: "kiss",
  shrug: "shrug",
  dab: "dab",
  disco: "disco",
  whoa: "whoa",
  tik: "tik",
};

/** Emote ids arrive either bare ("dab") or as a full URN. Show the bare name. */
export function emoteLabel(emoteId: string): string {
  const bare = emoteId.includes(":")
    ? emoteId.slice(emoteId.lastIndexOf(":") + 1)
    : emoteId;
  return EMOTE_LABELS[bare] ?? bare;
}
