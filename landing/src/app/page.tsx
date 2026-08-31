/**
 * ============================================================================
 * MOCHI — landing page
 * ----------------------------------------------------------------------------
 * AESTHETIC DIRECTION: Organic & Natural, as daylight pastel.
 *
 *   Palette   assets/_tokens.css, unchanged. Cream sky, meadow green, two pinks
 *             and a wine-dark ink. Exactly one dark section, and it is the one
 *             about 2am — because the tokens are explicit that night is a state,
 *             not the theme.
 *   Type      Fraunces (variable SOFT + WONK — a serif built to be squishy)
 *             against Nunito, which is the brand's own wordmark typeface.
 *   Motion    The creature never stops breathing, and it squashes when pressed.
 *             A still page about squash-and-stretch would refute itself.
 *             Everything collapses cleanly under prefers-reduced-motion.
 *   Layout    7/5 and 5/7 bentos, an asymmetric hero, and a torn paper receipt
 *             rotated off-axis. No three-column feature grid anywhere.
 *
 * HONESTY CONSTRAINTS baked into the structure:
 *   • World URL is live since 2026-08-24 → WORLD_URL in lib/mochi.ts
 *   • Perf score is measured, on a flagship → PERF_SCORE in lib/mochi.ts,
 *     and the page names the device rather than quoting the number bare
 *   • No users exist → every count is read live from the real Fly.io server,
 *     and the testimonial slot is replaced by verifiable receipts.
 * ============================================================================
 */

import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";
import { Problem } from "@/components/problem";
import { Mechanism } from "@/components/mechanism";
import { LiveSection } from "@/components/live-section";
import { Benefits } from "@/components/benefits";
import { Receipts } from "@/components/receipts";
import { FAQ } from "@/components/faq";
import { FinalCTA } from "@/components/final-cta";
import { SiteFooter } from "@/components/site-footer";
import { LiveStateProvider } from "@/components/live-state-provider";
import { RevealScope } from "@/components/reveal-scope";
import { getMochiState } from "@/lib/get-state";
import { REPO_URL } from "@/lib/mochi";

// The live creature is read on every request so the hero is never stale.
export const revalidate = 30;

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Mochi",
  applicationCategory: "GameApplication",
  operatingSystem: "Decentraland (Web, iOS, Android)",
  description:
    "A giant pastel blob co-parented by every stranger who visits a Decentraland world. Its size is the literal sum of every feeding and its dance is a chain where each move was taught by a named stranger.",
  // Edy Cu built this; DCL Regenesis Labs runs the buildathon it was built for.
  // Same reasoning as the `authors` field in layout.tsx — this one feeds rich
  // results, so crediting the organiser here is wrong in the same machine-
  // readable way, just in a second place.
  author: { "@type": "Person", name: "Edy Cu", url: "https://github.com/edycutjong" },
  license: "https://opensource.org/licenses/MIT",
  codeRepository: REPO_URL,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default async function Page() {
  // Server-side first paint: real numbers in the HTML, no flash of a fake zero.
  const initialState = await getMochiState();

  return (
    <LiveStateProvider initialState={initialState}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <RevealScope>
          <Problem />
          <Mechanism />
          <LiveSection />
          <Benefits />
          <Receipts />
          <FAQ />
          <FinalCTA />
        </RevealScope>
      </main>
      <SiteFooter />
    </LiveStateProvider>
  );
}
