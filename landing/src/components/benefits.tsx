/**
 * ELEMENT 7 — core benefits.
 *
 * Icons are drawn here rather than pulled from an icon set. A generic line-icon
 * pack would sit badly against a page built out of soft filled shapes, and the
 * six glyphs below are all built from the same vocabulary as the creature: a
 * fat rounded stroke, a pastel fill, no thin geometry anywhere.
 *
 * Layout deliberately staggers into 2 then 3 columns rather than a flat 3×2, so
 * the section does not read as a spec sheet.
 */

const STROKE = "#7a5165";

function IconClock() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="h-9 w-9">
      <circle cx="24" cy="25" r="16" fill="#ffd9e8" stroke={STROKE} strokeWidth="3.5" />
      <path d="M24 16v9l6 4" stroke={STROKE} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 7h14" stroke="#ff8fb1" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function IconThumb() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="h-9 w-9">
      <rect x="7" y="10" width="15" height="28" rx="7" fill="#ff8fb1" stroke={STROKE} strokeWidth="3.5" />
      <rect x="26" y="10" width="15" height="28" rx="7" fill="#ffd9e8" stroke={STROKE} strokeWidth="3.5" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="h-9 w-9">
      <path d="M24 6l14 5v13c0 9-6 15-14 18-8-3-14-9-14-18V11l14-5z" fill="#ffd9e8" stroke={STROKE} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M17 24l5 5 9-10" stroke="#b2436a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChain() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="h-9 w-9">
      <circle cx="11" cy="24" r="6.5" fill="#ffc2dc" stroke={STROKE} strokeWidth="3.5" />
      <circle cx="24" cy="24" r="6.5" fill="#ffc2dc" stroke={STROKE} strokeWidth="3.5" />
      <circle cx="38" cy="24" r="8" fill="#ff8fb1" stroke="#b2436a" strokeWidth="3.5" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="h-9 w-9">
      <rect x="13" y="5" width="22" height="38" rx="6" fill="#ffd9e8" stroke={STROKE} strokeWidth="3.5" />
      <path d="M21 11h6" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="24" cy="27" rx="7" ry="6" fill="#ff8fb1" />
    </svg>
  );
}

function IconZero() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="h-9 w-9">
      <circle cx="24" cy="24" r="16" fill="#ffd9e8" stroke={STROKE} strokeWidth="3.5" />
      <ellipse cx="24" cy="24" rx="6" ry="9" stroke="#b2436a" strokeWidth="3.5" />
    </svg>
  );
}

const BENEFITS = [
  {
    icon: <IconClock />,
    title: "Nobody has to be online",
    body: "No host, no schedule, no co-presence. You receive evidence of other people and leave state the next visitor inherits — even alone at 2am.",
    wide: true,
  },
  {
    icon: <IconThumb />,
    title: "Nothing to learn",
    body: "No buttons to find. Every verb is a thing in the meadow you tap — a bowl, a stage, a totem, and the creature itself. No typing anywhere; your name comes from your wallet.",
    wide: true,
  },
  {
    icon: <IconShield />,
    title: "You cannot fail it",
    body: "Hunger stops at a floor. Mochi never starves, never dies, never guilts you. 36,432 combinations were swept specifically to refute starvation.",
    wide: false,
  },
  {
    icon: <IconChain />,
    title: "Credit is permanent",
    body: "The chain is append-only — there is no delete verb anywhere in the server. The move you teach keeps your name on it for as long as Mochi exists.",
    wide: false,
  },
  {
    icon: <IconPhone />,
    title: "Built thumb-first",
    body: "A 6.7 MB payload against a 25 MB budget, under 250 entities against a 4,800 soft limit, and zero imported models — every shape is a procedural SDK7 primitive.",
    wide: false,
  },
  {
    icon: <IconZero />,
    title: "Costs nothing to run",
    body: "$0.00 in provider cost. No external API, no model, nothing on-chain, and exactly one runtime dependency.",
    wide: false,
  },
];

export function Benefits() {
  const wide = BENEFITS.filter((b) => b.wide);
  const narrow = BENEFITS.filter((b) => !b.wide);

  return (
    <section className="relative px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="reveal max-w-2xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b2436a]">
            Why it holds up
          </p>
          <h2 className="mt-4 text-[clamp(2.1rem,5.6vw,3.4rem)] font-black">
            Designed so the empty room
            <span className="text-[#b2436a]"> is never empty.</span>
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {wide.map((benefit, i) => (
            <article
              key={benefit.title}
              className="reveal group rounded-[2rem] border border-[#7a5165]/12 bg-gradient-to-br from-[#fff1e0] to-[#ffe8f1]/70 p-8 transition-all duration-500 hover:-translate-y-1.5 hover:border-[#ff8fb1]/50 hover:shadow-[0_24px_56px_rgba(74,59,82,0.14)]"
              style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff6fa] shadow-[0_4px_14px_rgba(74,59,82,0.08)] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                {benefit.icon}
              </div>
              <h3 className="mt-5 text-2xl font-black text-[#3b2a44]">
                {benefit.title}
              </h3>
              <p className="mt-3 leading-relaxed text-[#5e4666]">
                {benefit.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {narrow.map((benefit, i) => (
            <article
              key={benefit.title}
              className="reveal group rounded-[2rem] border border-[#7a5165]/12 bg-[#fff1e0]/80 p-7 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1.5 hover:border-[#ff8fb1]/50 hover:shadow-[0_24px_56px_rgba(74,59,82,0.14)]"
              style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff6fa] shadow-[0_4px_14px_rgba(74,59,82,0.08)] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                {benefit.icon}
              </div>
              <h3 className="mt-4 text-lg font-black leading-snug text-[#3b2a44]">
                {benefit.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#5e4666]">
                {benefit.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
