"use client";

import { Dialog } from "radix-ui";

import { Button } from "@/components/ui/button";
import { CopyLinkButton, WorldQrCode } from "@/components/world-qr";
import { WORLD_URL, WORLD_URL_PENDING, worldIsLive } from "@/lib/mochi";
import { cn } from "@/lib/utils";

/**
 * The "go to the world" call to action.
 *
 * The World went live on 2026-08-24, so this now renders as a real link to
 * wunderland.dcl.eth, driven by WORLD_URL in src/lib/mochi.ts.
 *
 * The unresolved branch below is kept deliberately. Before the grant landed it
 * rendered an explicitly dead control carrying the literal «PENDING:world-url»
 * token rather than a link to nowhere or an invented URL, and if WORLD_URL is
 * ever nulled the page returns to saying so instead of lying.
 */
export function EnterWorldButton({
  size = "lg",
  className,
  children = "Enter the meadow",
  showToken = true,
}: {
  size?: "lg" | "default";
  className?: string;
  children?: React.ReactNode;
  /** Header uses the compact form — the token would blow out the bar height. */
  showToken?: boolean;
}) {
  const shared = cn(
    "group relative rounded-full font-sans font-extrabold tracking-tight",
    "transition-all duration-300",
    size === "lg" ? "h-14 px-9 text-lg" : "h-11 px-6 text-base",
    className,
  );

  if (worldIsLive && WORLD_URL) {
    // Opens a panel rather than navigating. Most people read this page on a
    // laptop, and the World is genuinely better on a phone — so the useful
    // response to "take me there" is to offer both routes at once instead of
    // silently picking the one the visitor happens to be sitting in front of.
    return (
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <Button className={cn(shared, "bg-[#b2436a] text-[#fff6fa] shadow-[0_10px_30px_rgba(178,67,106,0.35)] hover:-translate-y-0.5 hover:bg-[#9c3a5d] hover:shadow-[0_16px_44px_rgba(178,67,106,0.45)]")}>
            {children}
            <span aria-hidden className="ml-1 transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[#3b2a44]/45 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,29rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-[#7a5165]/12 bg-[#fff6fa] p-7 shadow-[0_30px_80px_rgba(74,59,82,0.28)] focus:outline-none sm:p-9">
            <Dialog.Title className="text-center font-sans text-2xl font-black text-[#3b2a44]">
              Come and meet Mochi
            </Dialog.Title>
            <Dialog.Description className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-[#5e4666]">
              It runs on a laptop too, but it was built for a thumb — a phone is
              the way to see it.
            </Dialog.Description>

            <div className="mt-7 flex flex-col items-center gap-3">
              <WorldQrCode />
              <p className="text-sm font-bold text-[#3b2a44]">Scan to open on your phone</p>
            </div>

            <div className="mt-7 flex flex-col items-center gap-3">
              <Button asChild className="h-13 w-full rounded-full bg-[#b2436a] px-7 text-base font-extrabold text-[#fff6fa] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#9c3a5d]">
                <a href={WORLD_URL} target="_blank" rel="noreferrer">
                  Open it here instead
                  <span aria-hidden className="ml-1">→</span>
                </a>
              </Button>

              <code className="max-w-full truncate rounded-lg bg-[#ffe8f1] px-3 py-1.5 font-mono text-[0.78rem] text-[#b2436a]">
                wunderland.dcl.eth
              </code>

              <CopyLinkButton />
            </div>

            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full text-lg text-[#5e4666] transition-colors duration-300 hover:bg-[#ffe8f1] hover:text-[#b2436a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b2436a]"
              >
                <span aria-hidden>×</span>
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  const pendingButton = (
    <Button
      disabled
      aria-disabled
      title={`Not live yet — ${WORLD_URL_PENDING}`}
      className={cn(
        shared,
        // Button's own base variant carries `disabled:opacity-50`, compiled to
        // `.disabled\:opacity-50:disabled`. That beats a plain `opacity-100`
        // class on specificity (pseudo-class > bare class) regardless of
        // source order, so the button silently rendered at 50% opacity —
        // measured contrast ~2.1:1 against its cream/meadow surroundings.
        // `disabled:opacity-100` shares the same modifier group, so
        // tailwind-merge dedupes it correctly and this one wins.
        "cursor-not-allowed border-2 border-dashed border-[#b2436a]/45 bg-[#ffe8f1] text-[#b2436a] opacity-100 disabled:opacity-100 shadow-none",
      )}
    >
      {children}
      <span aria-hidden className="ml-1 opacity-50">
        →
      </span>
    </Button>
  );

  if (!showToken) return pendingButton;

  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      {pendingButton}
      {/* text-soft (#776384, 4.95:1 nominal) measures under 4.5:1 wherever this
          renders over the meadow-green gradient (e.g. the hero); text-mid has
          enough headroom to clear 4.5:1 against every background it appears
          on across the page. */}
      <code className="pl-1 font-mono text-[11px] tracking-tight text-[#5e4666]">
        {WORLD_URL_PENDING}
      </code>
    </span>
  );
}

/** Inline, sentence-level version of the same honesty. */
export function PendingWorldNote() {
  if (worldIsLive) return null;
  return (
    <span className="font-mono text-[11px] text-[#776384]">
      {WORLD_URL_PENDING}
    </span>
  );
}
