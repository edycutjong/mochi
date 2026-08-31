import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";

/**
 * Social cards are cached by URL, not by content. Discord, X, Slack, LinkedIn
 * and Facebook each keep the first copy they scrape, so republishing the same
 * filename changes nothing for anyone who has already shared the link — the
 * old card just keeps appearing.
 *
 * Bumping this forces every scraper to treat it as a new image. Increment it
 * whenever og-image.png changes.
 */
const OG_IMAGE = "/og-image.png?v=3";

/**
 * TYPE PAIRING — chosen, not defaulted.
 *
 * Fraunces exposes variable SOFT and WONK axes: a serif deliberately engineered
 * to be soft-cornered and slightly wrong-shaped. It is squash-and-stretch as a
 * typeface, which is the one idea this whole product rests on.
 *
 * Nunito is the brand's own font — the repo wordmark in assets/wordmarks.json is
 * Nunito 800 outlines — so the interface layer is literally the same typeface as
 * the icon and the BUIDL page.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mochi.edycu.dev"),
  title: {
    default: "Mochi — the creature Decentraland is raising together",
    template: "%s · Mochi",
  },
  // 149 characters. Google truncates around 155–160, so this is close to the
  // limit while still ending on a whole thought rather than an ellipsis.
  description:
    "A giant pastel blob co-parented by every stranger who visits. Its size is the sum of every feeding; its dance was taught by named strangers.",
  keywords: [
    "Decentraland",
    "SDK7",
    "Decentraland Mobile",
    "asynchronous multiplayer",
    "virtual pet",
    "metaverse",
    "social presence",
    "DoraHacks",
    "Friendzone Buildathon",
    "open source",
  ],
  // Edy Cu built this. DCL Regenesis Labs runs the buildathon it was built
  // for — crediting them as the author would be wrong in a machine-readable
  // field that feeds search results and social cards.
  authors: [{ name: "Edy Cu", url: "https://github.com/edycutjong" }],
  creator: "Edy Cu",
  publisher: "Edy Cu",
  openGraph: {
    type: "website",
    // Discord renders this above the title; without it the card is anonymous.
    siteName: "Mochi",
    url: "https://mochi.edycu.dev",
    locale: "en_GB",
    title: "Mochi — the creature Decentraland is raising together",
    // 97 characters. Social cards commonly clip around 125 and mobile clips
    // sooner, so this stays comfortably inside the shortest of them.
    description:
      "Its size is the sum of every feeding. Its dance was taught, move by move, by named strangers.",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Mochi, a giant pastel blob on a green meadow under a cream sky",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    // Edy Cu built this and posted the Mochi thread from @edycutjong. Without
    // a creator handle X renders the card unattributed, and the "from" credit
    // on every reshare goes to nobody.
    creator: "@edycutjong",
    site: "@edycutjong",
    title: "Mochi — the creature Decentraland is raising together",
    // 113 characters — X clips the card description early on mobile.
    description:
      "A blob co-parented by strangers. Its body is the record of everyone who ever cared for it. Come feed it.",
    images: [
      {
        url: OG_IMAGE,
        alt: "Mochi, a giant pastel blob on a green meadow under a cream sky",
      },
    ],
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon-512.png" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#FFF4E6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/*
          `.reveal` (globals.css) starts at opacity:0 and is only flipped to
          visible by the IntersectionObserver in use-reveal.ts. That is fine
          when JS runs, but this is a static export with no server fallback —
          if JS fails to load or is disabled, nothing ever adds `.revealed`
          and most of the page (Problem, Mechanism, LiveSection, Benefits,
          Receipts, FAQ, FinalCTA) stays permanently invisible. <noscript>
          only renders when JS does not run, so this mirrors the
          prefers-reduced-motion fallback already in globals.css.
        */}
        <noscript>
          <style>{`.reveal{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
