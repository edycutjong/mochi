import { GROWTH } from "@/lib/mochi";

/**
 * ELEMENT 6 — the visual demonstration.
 *
 * No in-world screenshots exist yet (the World has not been granted), and the
 * brief forbids placeholder imagery. So rather than grey boxes, each of the
 * four mechanics is drawn as a purpose-built diagram of the actual mechanism.
 * These are illustrations of real behaviour, not stand-ins for a screenshot.
 *
 * Layout is a deliberate 7/5 · 5/7 bento rather than a four-across grid, so the
 * eye zig-zags instead of scanning a row of equal boxes.
 */

function Card({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`reveal group relative overflow-hidden rounded-[2rem] border border-[#7a5165]/12 bg-[#fff1e0]/85 p-7 shadow-[0_2px_4px_rgba(74,59,82,0.05),0_14px_40px_rgba(74,59,82,0.09)] backdrop-blur-sm transition-all duration-500 hover:-translate-y-1.5 hover:border-[#ff8fb1]/45 hover:shadow-[0_6px_10px_rgba(74,59,82,0.06),0_28px_64px_rgba(74,59,82,0.16)] sm:p-9 ${className}`}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b2436a]">
      {children}
    </p>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-3 text-[1.7rem] font-black leading-[1.08] text-[#3b2a44] sm:text-[2rem]">
      {children}
    </h3>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="mt-3.5 leading-relaxed text-[#5e4666]">{children}</p>;
}

/** Three blobs, each one the size the formula actually produces. */
function GrowthDiagram() {
  const steps = [
    { feeds: 0, label: "new" },
    { feeds: 30, label: "30 feedings" },
    { feeds: 75, label: "75 feedings" },
  ];
  return (
    <div className="mt-7 flex items-end justify-between gap-3 rounded-3xl bg-gradient-to-b from-[#eafaf1] to-[#a8e6cf]/70 px-5 pb-4 pt-8 sm:px-8">
      {steps.map((step) => {
        const scale = Math.min(
          GROWTH.baseScale + step.feeds * GROWTH.perFeed,
          GROWTH.maxScale,
        );
        const size = 30 * scale;
        return (
          <div key={step.label} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="relative rounded-[46%] border-[3px] border-[#7a5165] bg-gradient-to-b from-[#ffe7f1] to-[#ffc2dc] transition-all duration-500"
              style={{ width: `${size}px`, height: `${size * 0.88}px` }}
            >
              <span className="absolute left-[26%] top-[38%] h-[22%] w-[9%] rounded-full bg-[#7a5165]" />
              <span className="absolute right-[26%] top-[38%] h-[22%] w-[9%] rounded-full bg-[#7a5165]" />
            </div>
            {/* This label sits on the green meadow-gradient diagram
                background, where credited-ink's nominal 4.84:1 measured
                ~4.5:1 or slightly under. #8f3457 keeps >=5:1 there. */}
            <span className="font-mono text-[11px] font-bold text-[#8f3457]">
              {scale.toFixed(2)}×
            </span>
            <span className="text-center text-[11px] leading-tight text-[#5e4666]">
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** The chain as an ordered row of beads — never an orbit, because "last" is the point. */
function ChainDiagram() {
  const moves = [
    { seq: 1, move: "wave" },
    { seq: 2, move: "clap" },
    { seq: 3, move: "robot" },
    { seq: 4, move: "dab" },
  ];
  return (
    <div className="mt-7 rounded-3xl bg-gradient-to-br from-[#fff6fa] to-[#ffe8f1] p-5 sm:p-7">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        {moves.map((m, i) => {
          const credited = i === moves.length - 1;
          return (
            <div key={m.seq} className="flex shrink-0 items-center gap-1.5">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex items-center justify-center rounded-full border-[3px] font-mono text-[11px] font-bold ${
                    credited
                      ? "h-12 w-12 border-[#b2436a] bg-[#ff8fb1] text-[#46101f]"
                      // #71495d not #7a5165: the sequence number carries meaning
                      // and 7a5165 on ffc2dc is only 4.39:1.
                      : "h-9 w-9 border-[#7a5165] bg-[#ffc2dc] text-[#71495d]"
                  }`}
                >
                  {m.seq}
                </div>
                <span className="font-mono text-[10px] text-[#5e4666]">
                  {m.move}
                </span>
              </div>
              {i < moves.length - 1 && (
                <span aria-hidden className="text-[#7a5165]/35">
                  ─
                </span>
              )}
            </div>
          );
        })}
        <span aria-hidden className="pl-1 text-[#7a5165]/40">
          →
        </span>
      </div>
      <p className="mt-3 border-t border-[#7a5165]/10 pt-3 text-sm text-[#5e4666]">
        Mochi has no rig. Each move is a distinct squash-stretch signature, and
        it replays the whole chain{" "}
        <strong className="font-bold text-[#3b2a44]">oldest first</strong>,
        crediting every move by name.
      </p>
    </div>
  );
}

/**
 * The scene's four verbs, and the object in the meadow each one lives on.
 *
 * Kept in the same order a visitor meets them: the bowl and the stage flank the
 * path in from the spawn point, the creature is at the end of it, and the totem
 * is off to one side for when you are leaving.
 */
const VERBS = [
  { verb: "FEED", thing: "the bowl", accent: true },
  { verb: "TEACH", thing: "the stage", accent: false },
  { verb: "PET", thing: "the creature", accent: false },
  { verb: "STAMP", thing: "the totem", accent: false },
];

export function Mechanism() {
  return (
    <section id="how" className="relative px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="reveal mx-auto max-w-2xl text-center">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-4 text-[clamp(2.1rem,5.6vw,3.4rem)] font-black">
            One creature whose every visible property
            <span className="text-[#b2436a]"> was made by somebody else.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[#5e4666]">
            Nothing about Mochi is authored by us except the rules. Everything
            you can see was left behind by a person who came before you.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-12">
          <Card className="lg:col-span-7" delay={0}>
            <Eyebrow>Its size</Eyebrow>
            <Title>The literal sum of every feeding.</Title>
            <Body>
              Not a counter beside the creature — the blob is physically bigger
              because people fed it. Every feeding adds{" "}
              <span className="font-mono font-bold text-[#b2436a]">
                +1.2%
              </span>{" "}
              to its scale, permanently, up to{" "}
              <span className="font-mono font-bold text-[#b2436a]">1.9×</span>.
            </Body>
            <GrowthDiagram />
          </Card>

          <Card className="lg:col-span-5" delay={90}>
            <Eyebrow>Its plaque</Eyebrow>
            <Title>Names the last human.</Title>
            <Body>
              A stone by the creature that always names whoever most recently
              cared for it — and how long the meadow has been waiting since.
            </Body>
            <div className="mt-7 rounded-3xl bg-gradient-to-b from-[#eafaf1] to-[#a8e6cf]/60 p-6">
              <div className="mx-auto max-w-[230px] rounded-2xl border-2 border-[#7a5165]/25 bg-[#fff1e0] px-5 py-4 text-center shadow-[0_8px_24px_rgba(74,59,82,0.12)]">
                <p className="font-bold text-[#3b2a44]">last fed by Kito</p>
                <p className="text-sm text-[#5e4666]">3h ago</p>
              </div>
              {/* On the green plaque-diagram background, the 80%-opacity ink
                  measured ~3.9:1. Full-strength keeps ~6:1. */}
              <p className="mt-3 text-center text-[11px] text-[#5e4666]">
                and the hunger has visibly drained since
              </p>
            </div>
          </Card>

          <Card className="lg:col-span-5" delay={0}>
            <Eyebrow>The away-line</Eyebrow>
            <Title>Names who followed you.</Title>
            <Body>
              Come back later and Mochi tells you the specific person whose act
              came after yours. Not a notification count — a name.
            </Body>
            <div className="mt-7 rounded-3xl bg-gradient-to-br from-[#fff6fa] to-[#ffe8f1] p-6">
              <div className="relative rounded-2xl bg-[#fff1e0] px-5 py-4 shadow-[0_8px_24px_rgba(74,59,82,0.10)]">
                <span
                  aria-hidden
                  className="absolute -bottom-2 left-9 h-4 w-4 rotate-45 bg-[#fff1e0]"
                />
                <p className="relative text-[15px] font-bold text-[#3b2a44]">
                  Rue fed Mochi after you left
                </p>
              </div>
              {/* Measured ~4.35:1 at 80% opacity on this card's pink
                  background — just under threshold. Full-strength clears it. */}
              <p className="mt-5 text-center text-[11px] text-[#5e4666]">
                shown for 7 seconds, once, on your return
              </p>
            </div>
          </Card>

          <Card className="lg:col-span-7" delay={90}>
            <Eyebrow>Its dance</Eyebrow>
            <Title>A credited chain, replayed in order.</Title>
            <Body>
              Each move was taught by one named person. When Mochi performs, it
              replays the whole chain in order, crediting every move to the
              stranger who taught it — beside ghost dancers wearing those
              people&rsquo;s real wearables, captured at the moment they taught
              it.
            </Body>
            <ChainDiagram />
          </Card>
        </div>

        {/*
          The four verbs. Every one of them is an object in the meadow.

          This card used to show two pink FEED / TEACH pills, because that is
          what the scene used to draw. Device testing on 2026-08-23 found that
          bottom-of-screen strip sitting directly on the Decentraland client's
          own joystick, jump and emote controls — a tap aimed at jump landed on
          TEACH — so the buttons were deleted and the verbs became props. The
          card follows the product rather than the other way round.
        */}
        <div className="reveal mt-14 overflow-hidden rounded-[2rem] border border-[#7a5165]/12 bg-gradient-to-br from-[#fff1e0] to-[#ffe8f1] px-7 py-10 text-center sm:px-12">
          <Eyebrow>The whole interface</Eyebrow>
          <h3 className="mx-auto mt-3 max-w-2xl text-[clamp(1.6rem,4vw,2.3rem)] font-black">
            No buttons. Four things you can touch.
          </h3>
          <div className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            {VERBS.map((verb) => (
              <div
                key={verb.verb}
                className={
                  "flex h-20 flex-col items-center justify-center rounded-2xl " +
                  (verb.accent
                    ? "bg-[#ff8fb1] text-[#46101f] shadow-[0_8px_24px_rgba(255,143,177,0.45)]"
                    : "border-2 border-[#7a5165]/25 bg-[#fff1e0] text-[#3b2a44]")
                }
              >
                <span className="text-base font-black tracking-[0.1em]">
                  {verb.verb}
                </span>
                <span className="mt-1 text-xs font-semibold opacity-70">
                  {verb.thing}
                </span>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-lg text-sm text-[#5e4666]">
            The scene draws nothing over the bottom of the screen, where the
            Decentraland client keeps its own joystick and jump control — an
            earlier two-button HUD sat on top of them on a real phone, so it was
            deleted rather than nudged. There is no text input anywhere either;
            your identity comes from your wallet.
          </p>
        </div>
      </div>
    </section>
  );
}
