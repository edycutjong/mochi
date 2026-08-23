"use client";

import { useLiveMochi } from "@/components/live-state-provider";
import {
  HUNGER,
  STATE_ENDPOINT,
  ago,
  emoteLabel,
  feedsUntilMax,
  scaleForFeedCount,
} from "@/lib/mochi";

/**
 * ELEMENT 5 — social proof, done without lying.
 *
 * Mochi has one carer. The honest move is not to hide that or dress it up, but
 * to wire the page to the live server and let it say so — and then say so
 * again, automatically, the moment it stops being true. A number that is
 * verifiably real and small beats an impressive number a judge cannot check,
 * and the endpoint is public so anyone can check it in one click.
 */

function Stat({
  value,
  label,
  hint,
  accent = false,
  loading = false,
}: {
  value: string;
  label: string;
  hint?: string;
  accent?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-[#7a5165]/12 bg-[#fff1e0]/80 px-5 py-6 text-center backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#ff8fb1]/45">
      {loading ? (
        <div className="skeleton mx-auto h-11 w-16 rounded-xl" />
      ) : (
        <p
          className={`font-display text-[clamp(2.2rem,6vw,3rem)] font-black leading-none tabular-nums ${
            accent ? "text-[#b2436a]" : "text-[#3b2a44]"
          }`}
        >
          {value}
        </p>
      )}
      <p className="mt-2.5 text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#5e4666]">
        {label}
      </p>
      {hint && <p className="mt-1 text-[11px] text-[#776384]">{hint}</p>}
    </div>
  );
}

export function LiveSection() {
  const { state, offline, now } = useLiveMochi();

  const feedCount = state?.pet.feedCount ?? 0;
  const hunger = state?.pet.hunger ?? HUNGER.floor;
  const scale = scaleForFeedCount(feedCount);
  const fedPercent = Math.round(hunger * 100);
  const chain = state?.chain ?? [];

  return (
    <section id="live" className="relative px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="reveal mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#7a5165]/15 bg-[#fff1e0]/80 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#5e4666]">
            <span className="relative flex h-1.5 w-1.5">
              {!offline && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff8fb1] opacity-75" />
              )}
              <span
                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                  offline ? "bg-[#776384]" : "bg-[#b2436a]"
                }`}
              />
            </span>
            {offline ? "Server unreachable" : "Live from the real server"}
          </div>
          <h2 className="mt-5 text-[clamp(2.1rem,5.6vw,3.4rem)] font-black">
            Mochi, right now.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[#5e4666]">
            These are not marketing numbers. They are read from the running
            authoritative server every 45 seconds, and you can check them
            yourself at{" "}
            <a
              href={STATE_ENDPOINT}
              target="_blank"
              rel="noreferrer"
              className="break-all font-mono text-[0.9em] font-bold text-[#b2436a] underline decoration-[#ff8fb1] decoration-2 underline-offset-4 transition-colors hover:text-[#9c3a5d]"
            >
              /state
            </a>
            .
          </p>
        </div>

        {/*
          `loading` gates the shimmer skeleton on `state` alone, but if the
          server is unreachable at BOTH build time and every client poll,
          `state` never becomes non-null and the shimmer would animate
          forever — a spinner that never resolves. `offline` is already known
          synchronously on mount whenever the build-time snapshot failed, so
          gating on `!state && !offline` falls through to the honest zero
          fallback immediately instead of shimmering indefinitely.
        */}
        <div
          className="reveal mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4"
          style={{ ["--reveal-delay" as string]: "80ms" }}
        >
          <Stat
            value={String(state?.carerCount ?? 0)}
            label="Carers"
            hint="in the last 24 hours"
            loading={!state && !offline}
            accent
          />
          <Stat
            value={String(state?.chainLength ?? 0)}
            label="Moves in the chain"
            hint="each taught by a person"
            loading={!state && !offline}
          />
          <Stat
            value={String(feedCount)}
            label="Total feedings"
            hint={`${feedsUntilMax(feedCount)} more to reach full size`}
            loading={!state && !offline}
          />
          <Stat
            value={`${scale.toFixed(2)}×`}
            label="Current size"
            hint="starting size was 1.00×"
            loading={!state && !offline}
            accent
          />
        </div>

        {/* Hunger — rendered the way the scene renders it: as the creature's own
            colour and glow, never as a HUD bar. */}
        <div
          className="reveal mt-5 overflow-hidden rounded-[2rem] border border-[#7a5165]/12 bg-[#fff1e0]/80 p-7 backdrop-blur-sm sm:p-9"
          style={{ ["--reveal-delay" as string]: "160ms" }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="text-xl font-black text-[#3b2a44]">
              How full its belly is
            </h3>
            <p className="font-mono text-sm font-bold text-[#b2436a]">
              {fedPercent}%
            </p>
          </div>
          <div className="mt-4 h-3.5 overflow-hidden rounded-full bg-[#7a5165]/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#ffd9e8] to-[#ff8fb1] transition-[width] duration-1000 ease-out"
              style={{ width: `${Math.max(4, fedPercent)}%` }}
            />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#5e4666]">
            A full belly drains to the floor over{" "}
            <strong className="font-bold text-[#3b2a44]">36 hours</strong>, and
            stops at{" "}
            <strong className="font-bold text-[#3b2a44]">15%</strong> — Mochi
            gets needy so someone comes back for it, but it can never starve,
            never die, and never guilt you. Hunger is derived from a timestamp
            on every read, so there is no ticking clock to drift and a redeploy
            loses nothing.
          </p>
          {state && state.pet.lastFedAt > 0 && (
            <p className="mt-3 text-sm text-[#776384]">
              last fed by {state.pet.lastFedBy} · {ago(state.pet.lastFedAt, now)}
            </p>
          )}
        </div>

        {/* The real chain */}
        <div
          className="reveal mt-5 overflow-hidden rounded-[2rem] border border-[#7a5165]/12 bg-[#fff1e0]/80 p-7 backdrop-blur-sm sm:p-9"
          style={{ ["--reveal-delay" as string]: "220ms" }}
        >
          <h3 className="text-xl font-black text-[#3b2a44]">
            The chain as it stands
          </h3>
          <p className="mt-2 text-sm text-[#5e4666]">
            Every bead is one move, credited to the person who taught it, in the
            order Mochi will replay them.
          </p>

          {chain.length > 0 ? (
            <ol className="mt-6 flex flex-wrap gap-2.5">
              {chain.map((move, i) => {
                const credited = i === chain.length - 1;
                return (
                  <li
                    key={move.seq}
                    className={`flex items-center gap-2.5 rounded-2xl border-2 px-3.5 py-2.5 ${
                      credited
                        ? "border-[#b2436a] bg-[#ffe8f1]"
                        : "border-[#7a5165]/18 bg-[#fff6fa]"
                    }`}
                    style={{
                      animation: "bead-land 0.5s var(--ease-squish) both",
                      animationDelay: `${i * 55}ms`,
                    }}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold ${
                        credited
                          ? "bg-[#ff8fb1] text-[#46101f]"
                          : "bg-[#ffc2dc] text-[#71495d]"
                      }`}
                    >
                      {move.seq}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#3b2a44]">
                      {emoteLabel(move.emoteId)}
                    </span>
                    <span className="text-xs text-[#5e4666]">
                      by {move.teacherName || "—"}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-6 rounded-2xl bg-[#fff6fa] px-5 py-6 text-center text-sm text-[#776384]">
              {offline
                ? "Could not reach the server to read the chain."
                : "Nobody has taught Mochi a move yet."}
            </p>
          )}
        </div>

        <p
          className="reveal mx-auto mt-8 max-w-2xl rounded-3xl border border-dashed border-[#7a5165]/22 px-6 py-5 text-center text-sm leading-relaxed text-[#5e4666]"
          style={{ ["--reveal-delay" as string]: "280ms" }}
        >
          <strong className="font-black text-[#3b2a44]">
            Yes, those numbers are small.
          </strong>{" "}
          Mochi has not opened to the public — the Decentraland World has not
          been granted yet. We would rather show you a real{" "}
          {state?.carerCount ?? 1} than an invented 214, and this page will say
          so the moment that changes.
        </p>
      </div>
    </section>
  );
}
