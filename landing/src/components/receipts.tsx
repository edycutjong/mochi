import { JUDGE_URL, PERF_SCORE, PERF_SCORE_PENDING, REPO_URL } from "@/lib/mochi";

/**
 * ELEMENT 8 — testimonials, replaced on purpose.
 *
 * The 11-element framework asks for 4-6 customer reviews here. Mochi has one
 * carer and zero users, so there are no honest reviews to run, and inventing
 * them is the single easiest thing on this page to fake and the single worst
 * thing to be caught doing in front of judges.
 *
 * So this slot does the same JOB — establish trust through outside-verifiable
 * evidence — with the only currency the project actually has: receipts. Every
 * line below is checkable from the repository, and the one number that has not
 * been measured is printed as an unresolved token rather than guessed.
 *
 * Styled as an actual till receipt, torn edges and all. It is the most
 * memorable object on the page and it is made entirely of true statements.
 */

interface Line {
  label: string;
  value: string;
  emphasis?: boolean;
  pending?: boolean;
}

const LINES: Line[] = [
  { label: "Tests", value: "221", emphasis: true },
  { label: "Test files", value: "13" },
  { label: "Statement coverage", value: "100%" },
  { label: "Branch coverage", value: "100%" },
  { label: "Function coverage", value: "100%" },
  { label: "Line coverage", value: "100%" },
  { label: "Combinations swept", value: "78,482", emphasis: true },
  { label: "...that starve Mochi", value: "0", emphasis: true },
  { label: "Runtime dependencies", value: "1  (ws)" },
  { label: "External APIs", value: "0" },
  { label: "AI models", value: "0" },
  { label: "On-chain contracts", value: "0" },
  { label: "Imported GLB/GLTF models", value: "0" },
  { label: "Deployable payload", value: "6.7 MB / 25 MB" },
  { label: "Scene entities", value: "<250 / 4,800" },
  { label: "Scene perf score", value: PERF_SCORE ?? PERF_SCORE_PENDING, pending: !PERF_SCORE },
  { label: "Licence", value: "MIT" },
];

const TORN =
  "linear-gradient(#000 0 0) center/100% calc(100% - 22px) no-repeat, conic-gradient(from -45deg at bottom, #0000 90deg, #000 0) bottom/26px 11px repeat-x, conic-gradient(from 135deg at top, #0000 90deg, #000 0) top/26px 11px repeat-x";

export function Receipts() {
  return (
    <section id="build" className="relative px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b2436a]">
            How it&rsquo;s built
          </p>
          <h2 className="mt-4 text-[clamp(2.1rem,5.6vw,3.4rem)] font-black">
            No testimonials.
            <span className="text-[#b2436a]"> Receipts instead.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[#5e4666]">
            Mochi has one carer, so it has no users to quote — and a quote is
            the easiest thing on a page like this to invent. Here is the
            evidence that can actually be checked.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          {/* ------------------------------------------------ the receipt */}
          {/* Sticky on desktop: the receipt stays alongside the prose instead of
              leaving a tall empty column once it runs out of lines.
              The shadow lives on the WRAPPER as a drop-shadow filter — a
              box-shadow on the masked element gets clipped away by its own mask
              and the paper ends up looking flat. */}
          <div
            className="reveal mx-auto w-full max-w-[400px] rotate-[-1.1deg] transition-transform duration-500 hover:rotate-0 lg:sticky lg:top-28"
            style={{
              ["--reveal-delay" as string]: "60ms",
              filter: "drop-shadow(0 18px 34px rgba(74,59,82,0.22))",
            }}
          >
            <div
              className="bg-[#fffdf7] px-7 py-9"
              style={{ mask: TORN, WebkitMask: TORN }}
            >
              <p className="text-center font-mono text-[11px] uppercase tracking-[0.22em] text-[#7a5165]">
                Mochi
              </p>
              <p className="mt-1 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#776384]">
                verified build receipt
              </p>

              <div
                aria-hidden
                className="my-5 border-t-2 border-dashed border-[#7a5165]/25"
              />

              <dl className="space-y-[7px]">
                {LINES.map((line) => (
                  <div
                    key={line.label}
                    className="flex items-baseline gap-1.5 font-mono text-[11.5px] leading-tight"
                  >
                    <dt
                      className={
                        line.emphasis
                          ? "font-bold text-[#3b2a44]"
                          : "text-[#5e4666]"
                      }
                    >
                      {line.label}
                    </dt>
                    <span
                      aria-hidden
                      className="min-w-3 flex-1 translate-y-[-3px] border-b border-dotted border-[#7a5165]/35"
                    />
                    <dd
                      className={`whitespace-nowrap ${
                        line.pending
                          ? "text-[10px] text-[#776384]"
                          : line.emphasis
                            ? "font-bold text-[#b2436a]"
                            : "text-[#3b2a44]"
                      }`}
                    >
                      {line.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div
                aria-hidden
                className="my-5 border-t-2 border-dashed border-[#7a5165]/25"
              />

              <p className="text-center font-mono text-[10px] leading-relaxed text-[#776384]">
                Decentraland SDK7 · TypeScript · react-ecs
                <br />
                Node 22.5 · ws · node:sqlite · Fly.io
              </p>
              <p className="mt-4 text-center font-mono text-[10px] tracking-[0.2em] text-[#7a5165]">
                ★ THANK YOU FOR FEEDING ★
              </p>
            </div>
          </div>

          {/* ------------------------------------------------ the prose */}
          <div className="space-y-5">
            {[
              {
                title: "One test is exhaustive, not representative.",
                body: "78,482 combinations were swept across the hunger model. Not a sample — the space. None of them produces a creature that starves. The claim 'Mochi cannot die' is not a design intention, it is a checked property.",
                delay: 0,
              },
              {
                title: "The whole scene is procedural.",
                body: "Zero imported GLB or GLTF models. The creature is a sphere under squash, the eyes are two planes, the chain is a row of beads. Every shape is an SDK7 primitive, which is why the payload is 6.7 MB and why it runs on a phone.",
                delay: 80,
              },
              {
                title: "Authoritative server, no chain, no model.",
                body: "A Node 22.5 process with ws and SQLite via the built-in node:sqlite, live on Fly.io. Hunger is derived from a timestamp on every read rather than ticked, so a redeploy loses nothing. One runtime dependency, $0.00 in provider cost.",
                delay: 160,
              },
              {
                title: "The perf score names its phone, because the phone matters.",
                body: `${PERF_SCORE ?? PERF_SCORE_PENDING} on a Galaxy S24 Ultra at High, Dynamic Graphics off. That is a flagship, and Decentraland's own guidance is to test on a mid-spec device like the Galaxy A54 — which has not been done. Read it as a ceiling, not a promise. It also started at 70%: the gap is five fixes found by testing on a real phone.`,
                delay: 240,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="reveal rounded-[1.75rem] border border-[#7a5165]/12 bg-[#fff1e0]/80 p-7 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-[#ff8fb1]/45"
                style={{ ["--reveal-delay" as string]: `${item.delay}ms` }}
              >
                <h3 className="text-xl font-black leading-snug text-[#3b2a44]">
                  {item.title}
                </h3>
                <p className="mt-2.5 leading-relaxed text-[#5e4666]">
                  {item.body}
                </p>
              </div>
            ))}

            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="reveal group flex items-center justify-between gap-4 rounded-[1.75rem] border-2 border-[#7a5165]/18 bg-[#fff6fa] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#b2436a]/50"
              style={{ ["--reveal-delay" as string]: "320ms" }}
            >
              <div>
                <p className="text-lg font-black text-[#3b2a44]">
                  Read every line of it
                </p>
                <p className="mt-1 font-mono text-xs text-[#5e4666]">
                  github.com/edycutjong/mochi · MIT
                </p>
                <p className="mt-1.5 text-xs text-[#776384]">
                  Public, MIT, and green on every check.
                </p>
              </div>
              <span
                aria-hidden
                className="shrink-0 text-2xl text-[#b2436a] transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </a>

            {/*
              A separate link, not nested inside the card above — the whole
              card is already an anchor to the repository root, and a judge
              arriving there has to go looking for the page written for them.
            */}
            <a
              href={JUDGE_URL}
              target="_blank"
              rel="noreferrer"
              className="reveal group flex items-center justify-between gap-4 rounded-[1.75rem] border-2 border-[#7a5165]/18 bg-[#fff6fa] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#b2436a]/50"
              style={{ ["--reveal-delay" as string]: "360ms" }}
            >
              <div>
                <p className="text-lg font-black text-[#3b2a44]">
                  In a hurry? Start here
                </p>
                <p className="mt-1 font-mono text-xs text-[#5e4666]">
                  JUDGE.md
                </p>
                <p className="mt-1.5 text-xs text-[#776384]">
                  Every number above, and the command that proves each one — about
                  thirty seconds end to end.
                </p>
              </div>
              <span
                aria-hidden
                className="shrink-0 text-2xl text-[#b2436a] transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
