"use client";

import { useState } from "react";

import { WORLD_URL } from "@/lib/mochi";

/**
 * The World address, in the forms a visitor actually needs.
 *
 * `https://decentraland.org/jump/?realm=<name>.dcl.eth` is Decentraland's own
 * documented way to open a World, and it behaves as a deep link: on a phone
 * with the app installed it hands straight to the app rather than to a web
 * page. So the same string works as a QR to scan, as a link to tap, and as
 * something to paste into a chat — which is why there is only one of it.
 *
 * The QR is a static inline path rather than a runtime library. The URL is a
 * constant, so generating it in the browser would ship a QR encoder to every
 * visitor to redraw the same 33x33 grid every time. It is also the only form
 * that still works with no network.
 *
 * Regenerate if WORLD_URL ever changes:
 *   python3 -c "import segno; print(segno.make('<WORLD_URL>', error='m').matrix)"
 */
const QR_PATH =
  "M2 2h7v1h-7zM14 2h5v1h-5zM20 2h2v1h-2zM25 2h1v1h-1zM28 2h7v1h-7zM2 3h1v1h-1zM8 3h1v1h-1zM11 3h2v1h-2zM14 3h7v1h-7zM23 3h3v1h-3zM28 3h1v1h-1zM34 3h1v1h-1zM2 4h1v1h-1zM4 4h3v1h-3zM8 4h1v1h-1zM12 4h1v1h-1zM15 4h1v1h-1zM18 4h2v1h-2zM21 4h2v1h-2zM28 4h1v1h-1zM30 4h3v1h-3zM34 4h1v1h-1zM2 5h1v1h-1zM4 5h3v1h-3zM8 5h1v1h-1zM12 5h1v1h-1zM15 5h4v1h-4zM20 5h1v1h-1zM24 5h1v1h-1zM28 5h1v1h-1zM30 5h3v1h-3zM34 5h1v1h-1zM2 6h1v1h-1zM4 6h3v1h-3zM8 6h1v1h-1zM11 6h2v1h-2zM14 6h1v1h-1zM16 6h1v1h-1zM19 6h1v1h-1zM25 6h1v1h-1zM28 6h1v1h-1zM30 6h3v1h-3zM34 6h1v1h-1zM2 7h1v1h-1zM8 7h1v1h-1zM10 7h1v1h-1zM12 7h1v1h-1zM14 7h1v1h-1zM17 7h8v1h-8zM28 7h1v1h-1zM34 7h1v1h-1zM2 8h7v1h-7zM10 8h1v1h-1zM12 8h1v1h-1zM14 8h1v1h-1zM16 8h1v1h-1zM18 8h1v1h-1zM20 8h1v1h-1zM22 8h1v1h-1zM24 8h1v1h-1zM26 8h1v1h-1zM28 8h7v1h-7zM11 9h2v1h-2zM16 9h11v1h-11zM2 10h1v1h-1zM5 10h1v1h-1zM7 10h2v1h-2zM10 10h3v1h-3zM14 10h2v1h-2zM21 10h1v1h-1zM23 10h1v1h-1zM26 10h2v1h-2zM29 10h1v1h-1zM3 11h1v1h-1zM6 11h1v1h-1zM10 11h1v1h-1zM13 11h1v1h-1zM15 11h2v1h-2zM18 11h3v1h-3zM24 11h1v1h-1zM26 11h4v1h-4zM33 11h2v1h-2zM2 12h2v1h-2zM6 12h1v1h-1zM8 12h4v1h-4zM14 12h3v1h-3zM18 12h1v1h-1zM21 12h4v1h-4zM28 12h3v1h-3zM32 12h1v1h-1zM34 12h1v1h-1zM2 13h3v1h-3zM7 13h1v1h-1zM9 13h2v1h-2zM13 13h3v1h-3zM17 13h2v1h-2zM21 13h1v1h-1zM23 13h1v1h-1zM26 13h1v1h-1zM28 13h1v1h-1zM30 13h2v1h-2zM34 13h1v1h-1zM2 14h4v1h-4zM8 14h2v1h-2zM16 14h4v1h-4zM22 14h2v1h-2zM26 14h4v1h-4zM31 14h1v1h-1zM33 14h2v1h-2zM2 15h1v1h-1zM4 15h1v1h-1zM7 15h1v1h-1zM9 15h2v1h-2zM14 15h4v1h-4zM19 15h1v1h-1zM21 15h1v1h-1zM23 15h2v1h-2zM26 15h1v1h-1zM28 15h1v1h-1zM30 15h2v1h-2zM33 15h2v1h-2zM3 16h4v1h-4zM8 16h1v1h-1zM13 16h6v1h-6zM20 16h1v1h-1zM23 16h7v1h-7zM32 16h2v1h-2zM2 17h2v1h-2zM5 17h2v1h-2zM10 17h1v1h-1zM16 17h1v1h-1zM18 17h2v1h-2zM21 17h3v1h-3zM28 17h1v1h-1zM33 17h1v1h-1zM4 18h2v1h-2zM7 18h2v1h-2zM10 18h1v1h-1zM13 18h1v1h-1zM16 18h2v1h-2zM19 18h1v1h-1zM22 18h3v1h-3zM26 18h1v1h-1zM28 18h1v1h-1zM30 18h1v1h-1zM33 18h1v1h-1zM3 19h2v1h-2zM6 19h2v1h-2zM9 19h3v1h-3zM13 19h3v1h-3zM18 19h2v1h-2zM23 19h1v1h-1zM25 19h3v1h-3zM29 19h1v1h-1zM31 19h1v1h-1zM33 19h1v1h-1zM2 20h1v1h-1zM7 20h2v1h-2zM11 20h2v1h-2zM16 20h1v1h-1zM20 20h1v1h-1zM22 20h1v1h-1zM27 20h1v1h-1zM32 20h3v1h-3zM3 21h1v1h-1zM13 21h1v1h-1zM16 21h2v1h-2zM19 21h1v1h-1zM21 21h4v1h-4zM28 21h2v1h-2zM34 21h1v1h-1zM4 22h2v1h-2zM7 22h4v1h-4zM12 22h1v1h-1zM19 22h3v1h-3zM23 22h3v1h-3zM27 22h1v1h-1zM29 22h1v1h-1zM3 23h1v1h-1zM6 23h2v1h-2zM9 23h1v1h-1zM12 23h1v1h-1zM14 23h2v1h-2zM17 23h1v1h-1zM19 23h1v1h-1zM22 23h2v1h-2zM26 23h3v1h-3zM32 23h3v1h-3zM2 24h4v1h-4zM7 24h3v1h-3zM11 24h1v1h-1zM13 24h3v1h-3zM18 24h2v1h-2zM21 24h1v1h-1zM28 24h2v1h-2zM32 24h1v1h-1zM34 24h1v1h-1zM3 25h3v1h-3zM7 25h1v1h-1zM11 25h5v1h-5zM17 25h1v1h-1zM20 25h1v1h-1zM22 25h3v1h-3zM26 25h3v1h-3zM30 25h2v1h-2zM2 26h1v1h-1zM6 26h1v1h-1zM8 26h5v1h-5zM14 26h1v1h-1zM19 26h2v1h-2zM22 26h2v1h-2zM26 26h5v1h-5zM33 26h2v1h-2zM10 27h5v1h-5zM19 27h1v1h-1zM21 27h2v1h-2zM24 27h3v1h-3zM30 27h2v1h-2zM33 27h2v1h-2zM2 28h7v1h-7zM12 28h1v1h-1zM14 28h1v1h-1zM16 28h1v1h-1zM18 28h3v1h-3zM22 28h2v1h-2zM26 28h1v1h-1zM28 28h1v1h-1zM30 28h4v1h-4zM2 29h1v1h-1zM8 29h1v1h-1zM10 29h1v1h-1zM13 29h3v1h-3zM19 29h1v1h-1zM21 29h1v1h-1zM23 29h1v1h-1zM26 29h1v1h-1zM30 29h1v1h-1zM34 29h1v1h-1zM2 30h1v1h-1zM4 30h3v1h-3zM8 30h1v1h-1zM11 30h1v1h-1zM14 30h4v1h-4zM20 30h5v1h-5zM26 30h6v1h-6zM2 31h1v1h-1zM4 31h3v1h-3zM8 31h1v1h-1zM10 31h1v1h-1zM13 31h1v1h-1zM15 31h5v1h-5zM25 31h1v1h-1zM28 31h1v1h-1zM30 31h3v1h-3zM2 32h1v1h-1zM4 32h3v1h-3zM8 32h1v1h-1zM12 32h1v1h-1zM17 32h3v1h-3zM22 32h1v1h-1zM25 32h2v1h-2zM30 32h3v1h-3zM34 32h1v1h-1zM2 33h1v1h-1zM8 33h1v1h-1zM12 33h1v1h-1zM14 33h3v1h-3zM19 33h2v1h-2zM22 33h6v1h-6zM31 33h1v1h-1zM2 34h7v1h-7zM10 34h1v1h-1zM13 34h2v1h-2zM16 34h3v1h-3zM23 34h1v1h-1zM26 34h1v1h-1zM30 34h1v1h-1zM33 34h1v1h-1z";

/** Quiet zone included: 33 modules of code, 2 modules of margin each side. */
const QR_VIEWBOX = 37;

export function WorldQrCode({ className = "h-[168px] w-[168px]" }: { className?: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-[#3b2a44] shadow-[0_8px_24px_rgba(122,81,101,0.14)]">
      <svg
        viewBox={`0 0 ${QR_VIEWBOX} ${QR_VIEWBOX}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label="QR code that opens the Mochi world in Decentraland"
        className={className}
      >
        <path fill="currentColor" d={QR_PATH} />
      </svg>
    </div>
  );
}

export function CopyLinkButton({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const url = WORLD_URL;

  if (!url) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused outright — insecure context, Safari
      // being particular about user gestures, a hardened profile. The address
      // is rendered as selectable text alongside for exactly this reason, so
      // the honest move is to leave the button unchanged rather than claim a
      // copy that did not happen.
      setCopied(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={`rounded-full border-2 border-[#b2436a]/35 px-5 py-2.5 font-sans text-sm font-extrabold text-[#b2436a] transition-colors duration-300 hover:border-[#b2436a] hover:bg-[#ffe8f1] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b2436a] ${className}`}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "World address copied to clipboard" : ""}
      </span>
    </>
  );
}
