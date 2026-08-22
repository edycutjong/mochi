import { Button } from "@/components/ui/button";
import { WORLD_URL, WORLD_URL_PENDING, worldIsLive } from "@/lib/mochi";
import { cn } from "@/lib/utils";

/**
 * The "go to the world" call to action.
 *
 * The World does not exist yet — DCL Regenesis Labs has not granted it — so
 * this renders as an explicitly unresolved control carrying the literal
 * «PENDING:world-url» token rather than a link to nowhere or an invented URL.
 *
 * When the World is granted, set WORLD_URL in src/lib/mochi.ts and every
 * instance of this button across the page becomes a live link. One line.
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
    return (
      <Button asChild className={cn(shared, "bg-[#b2436a] text-[#fff6fa] shadow-[0_10px_30px_rgba(178,67,106,0.35)] hover:-translate-y-0.5 hover:bg-[#9c3a5d] hover:shadow-[0_16px_44px_rgba(178,67,106,0.45)]")}>
        <a href={WORLD_URL} target="_blank" rel="noreferrer">
          {children}
          <span aria-hidden className="ml-1 transition-transform duration-300 group-hover:translate-x-1">→</span>
        </a>
      </Button>
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
