import type { Metadata } from "next";
import Link from "next/link";

import { DECK_URL, JUDGE_URL } from "@/lib/mochi";

/**
 * The 404 page.
 *
 * `output: 'export'` renders this to `out/404.html`, which is the exact
 * filename GitHub Pages serves for any path it cannot resolve — so this
 * replaces the stock Pages "File not found" page on the real domain, not just
 * in `next dev`.
 *
 * It stays a server component with no client JS: a visitor who mistyped a URL
 * is the least patient visitor the site gets, and the reveal-on-scroll
 * machinery that the main page uses would start this one at opacity:0.
 */
export const metadata: Metadata = {
  title: "Not found",
  // A wrong URL is not a page anyone should reach from a search result.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-[#fff4e6] px-6 py-20 text-center">
      <p className="font-mono text-sm font-bold tracking-widest text-[#b2436a]">
        404
      </p>

      <h1 className="mt-4 max-w-xl font-serif text-4xl font-black leading-tight text-[#3b2a44] sm:text-5xl">
        There is no meadow at this address
      </h1>

      <p className="mt-5 max-w-md text-base leading-relaxed text-[#5e4666]">
        Mochi is still where you left it — the page you asked for is the thing
        that does not exist. Nothing has been lost from the creature.
      </p>

      <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
        <Link
          href="/"
          className="rounded-full bg-[#b2436a] px-9 py-4 font-sans text-lg font-extrabold tracking-tight text-[#fff6fa] shadow-[0_10px_30px_rgba(178,67,106,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#9c3a5d] hover:shadow-[0_16px_44px_rgba(178,67,106,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b2436a]"
        >
          Back to Mochi
          <span aria-hidden className="ml-1">
            →
          </span>
        </Link>

        <a
          href={DECK_URL}
          className="rounded-full border-2 border-[#b2436a]/35 bg-[#ffe8f1] px-7 py-3.5 font-sans text-base font-extrabold tracking-tight text-[#b2436a] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#b2436a]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b2436a]"
        >
          Read the deck
        </a>
      </div>

      <p className="mt-10 text-sm text-[#5e4666]">
        Verifying something specific?{" "}
        <a
          href={JUDGE_URL}
          target="_blank"
          rel="noreferrer"
          className="font-bold text-[#b2436a] underline decoration-[#b2436a]/35 underline-offset-4 transition-colors duration-300 hover:decoration-[#b2436a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b2436a]"
        >
          Every number, and how to check it
        </a>
        .
      </p>
    </main>
  );
}
