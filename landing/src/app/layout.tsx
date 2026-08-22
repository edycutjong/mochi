import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";

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
  axes: ["SOFT", "WONK", "opsz"],
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
  description:
    "A giant pastel blob co-parented by every stranger who visits. Its size is the literal sum of every feeding, and its dance is a chain where each move was taught by a named stranger. A Decentraland SDK7 world that feels inhabited with nobody online.",
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
  authors: [{ name: "DCL Regenesis Labs" }],
  creator: "DCL Regenesis Labs",
  openGraph: {
    type: "website",
    title: "Mochi — the creature Decentraland is raising together",
    description:
      "Its size is the literal sum of every feeding. Its dance is a chain where every move was taught by a named stranger. Two thumb buttons, one creature, no typing.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mochi, a giant pastel blob on a green meadow under a cream sky",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mochi — the creature Decentraland is raising together",
    description:
      "A giant pastel blob co-parented by every stranger who visits. Its body is the record of everyone who cared for it.",
    images: ["/og-image.png"],
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
