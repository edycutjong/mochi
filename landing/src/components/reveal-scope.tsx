"use client";

import { useReveal } from "@/lib/use-reveal";

/** Mounts the single page-wide IntersectionObserver for .reveal elements. */
export function RevealScope({ children }: { children: React.ReactNode }) {
  useReveal();
  return <>{children}</>;
}
