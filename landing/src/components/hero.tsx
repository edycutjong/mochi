"use client";

import { MochiBlob } from "@/components/mochi-blob";
import { EnterWorldButton } from "@/components/enter-world";
import { useLiveMochi } from "@/components/live-state-provider";
import { ago, scaleForFeedCount, HUNGER } from "@/lib/mochi";

/**
 * HERO.
 *
 * The creature on the right is not an illustration of the product. It is the
 * product's live state: its size comes from the real feedCount on the Fly.io
 * server through the real growth formula, its colour from the real hunger, and
 * the plaque under it prints the real last carer. If someone feeds Mochi in
 * Decentraland, this hero gets bigger.
 *
 * That is why there are no invented statistics anywhere on this page — the real
 * ones, however small, are doing something an invented number cannot.
 */

const TITLE_WORDS = ["The", "blob", "that", "Decentraland"];
const TITLE_WORDS_2 = ["is", "raising", "together."];

export function Hero() {
  const { state, offline, now } = useLiveMochi();

  const feedCount = state?.pet.feedCount ?? 0;
  const hunger = state?.pet.hunger ?? HUNGER.floor;
  const scale = scaleForFeedCount(feedCount);
  const lastFedBy = state?.pet.lastFedBy;
  const lastFedAt = state?.pet.lastFedAt ?? 0;

  return (
    <section
      id="top"
      className="grain relative overflow-hidden pb-20 pt-10 sm:pb-28 sm:pt-16"
    >
      {/* The meadow. A soft horizon rather than a hard section edge — the page
          should feel like a place, not a stack of blocks. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-10%] bottom-0 h-[46%] rounded-t-[100%] bg-gradient-to-b from-[#c9f0dc] to-[#a8e6cf] opacity-70"
      />
      <div
        aria-hidden
        className="drifting pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#ffd9e8] opacity-45 blur-3xl"
      />
      <div
        aria-hidden
        className="drifting pointer-events-none absolute -right-16 top-8 h-80 w-80 rounded-full bg-[#ff8fb1] opacity-25 blur-3xl"
        style={{ animationDelay: "-4s" }}
      />

      {/*
        Grid areas rather than a plain two-column split, because the mobile
        reading order matters more than the desktop one here. On a phone the
        creature is interleaved directly after the headline — a page whose whole
        argument is "this thing is alive" cannot make you scroll past three
        paragraphs before you meet it. On desktop the same three blocks
        reassemble into text-left / creature-right.
      */}
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-x-6 gap-y-8 px-5 [grid-template-areas:'top'_'art'_'bottom'] sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-y-0 lg:[grid-template-areas:'top_art'_'bottom_art']">
        {/* ---------------------------------------------------------------- */}
        <div className="max-w-xl [grid-area:top]">
          <div
            className="animate-rise inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-[#7a5165]/15 bg-[#fff1e0]/80 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#5e4666] backdrop-blur-sm sm:text-xs"
            style={{ animationDelay: "0ms" }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff8fb1] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#b2436a]" />
            </span>
            Decentraland SDK7
            <span aria-hidden className="text-[#776384]">·</span>
            Friendzone Buildathon
          </div>

          <h1 className="mt-5 text-[clamp(2.6rem,8.2vw,4.6rem)] font-black">
            {TITLE_WORDS.map((word, i) => (
              <span
                key={word}
                className="animate-rise-slide mr-[0.22em] inline-block"
                style={{ animationDelay: `${i * 26}ms` }}
              >
                {word}
              </span>
            ))}
            <br />
            {TITLE_WORDS_2.map((word, i) => (
              <span
                key={word}
                className="animate-rise-slide mr-[0.22em] inline-block"
                style={{
                  animationDelay: `${(TITLE_WORDS.length + i) * 26}ms`,
                  color: i === 2 ? "var(--credited-ink)" : undefined,
                  fontVariationSettings: i === 2 ? '"SOFT" 100, "WONK" 1' : undefined,
                }}
              >
                {word}
              </span>
            ))}
          </h1>
        </div>

        {/* ------------------------------------------------ prose + actions */}
        <div className="max-w-xl [grid-area:bottom]">
          <p
            className="animate-rise text-lg leading-relaxed text-[#5e4666] sm:text-xl lg:mt-6"
            style={{ animationDelay: "170ms" }}
          >
            A giant pastel blob co-parented by every stranger who visits. Its
            size is the{" "}
            <strong className="font-extrabold text-[#3b2a44]">
              literal sum of every feeding
            </strong>
            . Its dance is a chain where{" "}
            <strong className="font-extrabold text-[#3b2a44]">
              every move was taught by a named stranger
            </strong>
            .
          </p>

          <p
            className="animate-rise mt-4 text-base text-[#5e4666]"
            style={{ animationDelay: "230ms" }}
          >
            No buttons. One creature, one meadow, four things you can touch. No
            typing anywhere.
          </p>

          <div
            className="animate-rise mt-8 flex flex-wrap items-start gap-4"
            style={{ animationDelay: "290ms" }}
          >
            <a
              href="#live"
              className="group inline-flex h-14 items-center gap-2 rounded-full bg-[#b2436a] px-8 text-lg font-extrabold tracking-tight text-[#fff6fa] shadow-[0_10px_30px_rgba(178,67,106,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#9c3a5d] hover:shadow-[0_16px_44px_rgba(178,67,106,0.45)]"
            >
              See Mochi right now
              <span
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-y-0.5"
              >
                ↓
              </span>
            </a>
            <EnterWorldButton />
          </div>
        </div>

        {/* ------------------------------------------------------ the creature */}
        <div className="relative flex flex-col items-center [grid-area:art]">
          <MochiBlob
            feedCount={feedCount}
            hunger={hunger}
            interactive
            className="h-[260px] w-full max-w-[440px] select-none sm:h-[340px] lg:h-[380px]"
          />

          {/* The plaque. Lowercase and two lines, because that is exactly how
              build/src/mochi/plaque.ts renders it in-world. */}
          <div className="animate-rise -mt-2 w-full max-w-[330px]" style={{ animationDelay: "350ms" }}>
            <div className="rounded-2xl border border-[#7a5165]/15 bg-[#fff1e0]/90 px-5 py-3.5 text-center shadow-[0_8px_28px_rgba(74,59,82,0.10)] backdrop-blur-sm">
              {/* The static words are lowercase because plaque.ts renders them
                  that way. The NAME keeps whatever case its owner chose — a CSS
                  text-transform here would quietly rewrite real people's names. */}
              {lastFedBy && lastFedAt > 0 ? (
                <>
                  <p className="text-[15px] font-bold text-[#3b2a44]">
                    last fed by {lastFedBy}
                  </p>
                  <p className="text-[13px] text-[#5e4666]">
                    {ago(lastFedAt, now)}
                  </p>
                </>
              ) : (
                <p className="text-[15px] font-bold text-[#5e4666]">
                  {offline ? "the meadow is quiet" : "nobody has fed Mochi yet"}
                </p>
              )}
            </div>
            {/*
              This plaque sits in the meadow-gradient region of the hero, not
              on the plain cream surface the design tokens were rated against.
              Measured real contrast there: text-soft (#776384, 4.95:1
              nominal) dropped to ~3.8-4.2:1, and credited-ink (#b2436a,
              4.84:1 nominal) dropped to ~3.8:1. text-mid and the darker wine
              #8f3457 both keep >=4.5:1 against every background sampled.
            */}
            <p className="mt-2.5 text-center text-xs text-[#5e4666]">
              {offline ? (
                "live state unavailable right now"
              ) : (
                <>
                  live from the real server · fed {feedCount}{" "}
                  {feedCount === 1 ? "time" : "times"}, so it is{" "}
                  <span className="font-mono font-bold text-[#8f3457]">
                    {scale.toFixed(3)}×
                  </span>{" "}
                  its starting size
                </>
              )}
            </p>
            <p className="mt-1 text-center text-[11px] text-[#5e4666]">
              press the blob to pet it
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
