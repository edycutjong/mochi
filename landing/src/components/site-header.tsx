"use client";

import { useEffect, useState } from "react";
import { Wordmark } from "@/components/wordmark";
import { EnterWorldButton } from "@/components/enter-world";
import { JUDGE_URL } from "@/lib/mochi";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#live", label: "Live" },
  { href: "#build", label: "How it's built" },
  { href: "#faq", label: "FAQ" },
];

/**
 * Sticky header: transparent over the hero, frosted cream once you leave it.
 * The logo mark is a miniature of the real creature and it breathes, so the
 * brand's core claim is on screen before you have read a single word.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-500",
        scrolled
          ? "border-b border-[#7a5165]/12 bg-[#fff4e6]/85 backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:h-18 sm:px-8">
        <a
          href="#top"
          className="flex min-h-[44px] items-center gap-2.5 rounded-xl py-2"
          aria-label="Mochi, back to top"
        >
          <svg viewBox="0 0 60 60" className="h-8 w-8 shrink-0" aria-hidden>
            <g className="breathing" style={{ transformOrigin: "50% 78%" }}>
              <ellipse
                cx="30"
                cy="32"
                rx="22"
                ry="19"
                fill="#ffc2dc"
                stroke="#7a5165"
                strokeWidth="3.5"
              />
              <rect x="21" y="26" width="4.5" height="9" rx="2.25" fill="#7a5165" />
              <rect x="34.5" y="26" width="4.5" height="9" rx="2.25" fill="#7a5165" />
            </g>
          </svg>
          <Wordmark className="h-[19px] w-auto" />
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-bold text-[#5e4666] transition-colors duration-200 hover:bg-[#ffd9e8]/70 hover:text-[#b2436a]"
            >
              {item.label}
            </a>
          ))}

          {/* The only nav item that leaves the page, so it is marked rather
              than blended in: judges are the audience this page exists for,
              and the receipts were previously reachable only from the footer
              or by scrolling to the right section. */}
          <a
            href={JUDGE_URL}
            target="_blank"
            rel="noreferrer"
            className="ml-1 inline-flex items-center gap-1.5 rounded-full border-2 border-[#b2436a]/30 px-3.5 py-1.5 text-sm font-bold text-[#b2436a] transition-colors duration-200 hover:border-[#b2436a]/60 hover:bg-[#ffd9e8]/70"
          >
            For judges
            <span aria-hidden className="text-xs">
              ↗
            </span>
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden lg:block">
            <EnterWorldButton size="default" showToken={false} />
          </div>
          <a
            href="#live"
            className="rounded-full bg-[#b2436a] px-5 py-2.5 text-sm font-extrabold text-[#fff6fa] shadow-[0_6px_18px_rgba(178,67,106,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#9c3a5d] lg:hidden"
          >
            See it live
          </a>
        </div>
      </div>
    </header>
  );
}
