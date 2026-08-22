"use client";

import { MochiBlob } from "@/components/mochi-blob";
import { EnterWorldButton } from "@/components/enter-world";
import { useLiveMochi } from "@/components/live-state-provider";
import { HUNGER, REPO_URL } from "@/lib/mochi";

/**
 * ELEMENT 10 — the final CTA, and the page's biggest moment.
 *
 * The framework suggests adding urgency here: countdowns, limited spots,
 * scarcity. All of those would be fabricated for this product. But there is one
 * piece of real scarcity available, and it happens to be the most on-brand
 * sentence on the whole page: right now the plaque is nearly empty, so the next
 * person to arrive genuinely does get their name on it.
 *
 * That is true, checkable, and it is exactly what the product is about.
 */
export function FinalCTA() {
  const { state } = useLiveMochi();
  const feedCount = state?.pet.feedCount ?? 0;
  const hunger = state?.pet.hunger ?? HUNGER.floor;

  return (
    <section className="relative px-5 pb-20 pt-6 sm:px-8 sm:pb-28">
      <div className="grain relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-[#fff6fa] via-[#ffe8f1] to-[#a8e6cf] px-6 pb-12 pt-16 text-center shadow-[0_30px_80px_rgba(74,59,82,0.18)] sm:px-14 sm:pb-14 sm:pt-20">
        <div
          aria-hidden
          className="drifting pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-[#ff8fb1] opacity-25 blur-3xl"
        />
        <div
          aria-hidden
          className="drifting pointer-events-none absolute -right-16 bottom-10 h-72 w-72 rounded-full bg-[#ffd9e8] opacity-45 blur-3xl"
          style={{ animationDelay: "-5s" }}
        />

        <div className="relative z-10">
          <MochiBlob
            feedCount={feedCount}
            hunger={hunger}
            interactive
            className="mx-auto h-[190px] w-full max-w-[320px] select-none sm:h-[230px]"
          />

          <h2 className="mx-auto mt-4 max-w-3xl text-[clamp(2.2rem,6.2vw,3.8rem)] font-black">
            The plaque is nearly empty.
            <br />
            <span className="text-[#b2436a]">Yours could be the next name.</span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#5e4666]">
            Feed it once and it is permanently bigger. Teach it one move and
            every future visitor watches Mochi perform it with your name beside
            it. There is nothing to install, nothing to sign up for, and nothing
            to type.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row sm:items-start">
            <EnterWorldButton />
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex h-14 items-center gap-2 rounded-full border-2 border-[#7a5165]/25 bg-[#fff6fa]/80 px-8 text-lg font-extrabold tracking-tight text-[#3b2a44] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#b2436a]/50 hover:bg-[#fff6fa]"
            >
              Read the source
              <span
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </a>
          </div>

          {/* Section background gradients toward meadow green at the bottom
              (from-[#fff6fa] via-[#ffe8f1] to-[#a8e6cf]) where this line
              sits; the 80%-opacity ink measured ~3.9:1 there. Full-strength
              text-mid keeps ~6:1. */}
          <p className="mx-auto mt-8 max-w-md text-sm text-[#5e4666]">
            Built for the DoraHacks Friendzone Buildathon by DCL Regenesis Labs.
            MIT licensed.
          </p>
        </div>
      </div>
    </section>
  );
}
