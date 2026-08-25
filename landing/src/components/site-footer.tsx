import { Wordmark } from "@/components/wordmark";
import { PendingWorldNote } from "@/components/enter-world";
import { DECK_URL, JUDGE_URL, REPO_URL, STATE_ENDPOINT, worldIsLive, WORLD_URL } from "@/lib/mochi";

/**
 * ELEMENT 11 — footer.
 *
 * Multi-column, darker than the page body, with the legal and contact
 * information a judge or a curious visitor actually needs. Every link here
 * resolves to something real; the one thing that does not exist yet is labelled
 * as not existing yet rather than pointed at a placeholder page.
 */

const COLUMNS: {
  heading: string;
  links: { label: string; href?: string; note?: string; external?: boolean }[];
}[] = [
  {
    heading: "The creature",
    links: [
      { label: "How it works", href: "#how" },
      { label: "Live state", href: "#live" },
      { label: "How it's built", href: "#build" },
      { label: "FAQ", href: "#faq" },
      { label: "Pitch deck — 12 slides", href: DECK_URL, external: true },
    ],
  },
  {
    heading: "Verify",
    links: [
      { label: "For judges — every number, and how to check it", href: JUDGE_URL, external: true },
      { label: "Live /state endpoint", href: STATE_ENDPOINT, external: true },
      { label: "Source on GitHub", href: REPO_URL, external: true },
      { label: "MIT licence", href: `${REPO_URL}/blob/main/LICENSE`, external: true },
    ],
  },
  {
    heading: "Built with",
    links: [
      { label: "Decentraland SDK7", href: "https://docs.decentraland.org/creator/development-guide/sdk7/sdk7-overview/", external: true },
      { label: "Node 22.5 · ws · node:sqlite", note: "1 runtime dependency" },
      { label: "Fly.io", href: "https://fly.io", external: true },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-4 border-t border-[#7a5165]/12 bg-[#fff1e0]/70 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
          {/* brand column */}
          <div>
            <div className="flex items-center gap-2.5">
              <svg viewBox="0 0 60 60" className="h-8 w-8 shrink-0" aria-hidden>
                <g className="breathing" style={{ transformOrigin: "50% 78%" }}>
                  <ellipse cx="30" cy="32" rx="22" ry="19" fill="#ffc2dc" stroke="#7a5165" strokeWidth="3.5" />
                  <rect x="21" y="26" width="4.5" height="9" rx="2.25" fill="#7a5165" />
                  <rect x="34.5" y="26" width="4.5" height="9" rx="2.25" fill="#7a5165" />
                </g>
              </svg>
              <Wordmark className="h-[19px] w-auto" />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#5e4666]">
              A giant pastel blob co-parented by every stranger who visits, in a
              Decentraland world that stays inhabited with nobody online.
            </p>
            <div className="mt-5">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#5e4666]">
                World address
              </p>
              {worldIsLive && WORLD_URL ? (
                <a
                  href={WORLD_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block break-all font-mono text-xs text-[#b2436a] underline decoration-[#ff8fb1] underline-offset-4"
                >
                  {WORLD_URL}
                </a>
              ) : (
                <p className="mt-1">
                  <PendingWorldNote />
                </p>
              )}
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#3b2a44]">
                {column.heading}
              </h3>
              <ul className="mt-2 space-y-0.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <a
                        href={link.href}
                        target={link.external ? "_blank" : undefined}
                        rel={link.external ? "noreferrer" : undefined}
                        // py-2 keeps the tap target ~40px tall; a 20px text link
                        // is a thumb-miss on the device this product targets.
                        // Full-width, 40px-tall hit area: a short label like
                        // "FAQ" is otherwise a 28px-wide thumb target.
                        className="group flex min-h-[40px] w-full items-center gap-1 py-2 text-sm text-[#5e4666] transition-colors duration-200 hover:text-[#b2436a]"
                      >
                        {link.label}
                        {link.external && (
                          <span
                            aria-hidden
                            className="text-[10px] opacity-45 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                          >
                            ↗
                          </span>
                        )}
                      </a>
                    ) : (
                      <span className="text-sm text-[#5e4666]">
                        {link.label}
                        {link.note && (
                          <span className="block text-xs text-[#776384]">
                            {link.note}
                          </span>
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-[#7a5165]/12 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#5e4666]">
            © {new Date().getFullYear()} DCL Regenesis Labs · Released under the
            MIT Licence
          </p>
          <p className="text-xs text-[#776384]">
            Built for the DoraHacks Friendzone Buildathon. Not affiliated with
            Decentraland Foundation.
          </p>
        </div>
      </div>
    </footer>
  );
}
