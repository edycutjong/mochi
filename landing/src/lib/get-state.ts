import { STATE_ENDPOINT, parseState, type MochiState } from "@/lib/mochi";

/**
 * Server-side read of the live creature, used for the first paint.
 *
 * Rendering the real numbers into the HTML means no counter ever flashes a
 * fake zero, and a visitor with JS disabled still sees true state. The client
 * only ever refines this, never establishes it.
 *
 * Returns null when Fly.io is unreachable — every consumer must handle that,
 * because a landing page that breaks when its backend naps is worse than one
 * that quietly says so.
 */
export async function getMochiState(): Promise<MochiState | null> {
  try {
    const res = await fetch(STATE_ENDPOINT, {
      headers: { accept: "application/json" },
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return parseState(await res.json());
  } catch {
    return null;
  }
}
