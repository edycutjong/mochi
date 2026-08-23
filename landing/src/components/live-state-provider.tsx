"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { STATE_ENDPOINT, parseState, type MochiState } from "@/lib/mochi";

/**
 * One poller for the whole page.
 *
 * The server already rendered real numbers into the HTML, so this only ever
 * refines them. It also stops polling while the tab is hidden — there is no
 * excuse for a marketing page to keep a Fly.io machine awake in a background
 * tab.
 *
 * This is a static export (GitHub Pages), so there is no Node runtime to
 * proxy through anymore. The browser calls the Fly.io endpoint directly, which
 * works because it now sends `access-control-allow-origin: *`.
 */

interface LiveValue {
  state: MochiState | null;
  /** True when we are showing server-rendered numbers we could not refresh. */
  offline: boolean;
  /** Ticks up locally so relative timestamps stay honest without refetching. */
  now: number;
}

const LiveContext = createContext<LiveValue>({
  state: null,
  offline: true,
  now: Date.now(),
});

export function useLiveMochi() {
  return useContext(LiveContext);
}

export function LiveStateProvider({
  initialState,
  children,
}: {
  initialState: MochiState | null;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<MochiState | null>(initialState);
  const [offline, setOffline] = useState(initialState === null);
  const [now, setNow] = useState(() => initialState?.now ?? Date.now());

  // Keep "3h ago" truthful between polls.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch(STATE_ENDPOINT, {
          headers: { accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(6000),
        });
        if (cancelled) return;
        if (res.ok) {
          const next = parseState(await res.json());
          if (next) {
            setState(next);
            setNow(next.now);
            setOffline(false);
            return;
          }
        }
        setOffline(true);
      } catch {
        if (!cancelled) setOffline(true);
      }
    }

    // Read once on mount. Without this the page served the build-time snapshot
    // for a full interval, so the first thing a visitor saw was the state as of
    // the last deploy while the copy beside it said the numbers were live.
    poll();

    const id = window.setInterval(poll, 45_000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", poll);
    };
  }, []);

  const value = useMemo(
    () => ({ state, offline, now }),
    [state, offline, now],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
