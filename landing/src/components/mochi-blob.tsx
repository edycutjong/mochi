"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { GROWTH, HUNGER, scaleForFeedCount } from "@/lib/mochi";

/**
 * The creature.
 *
 * This is not decoration — it is a faithful 2D restatement of what the SDK7
 * scene actually renders, and it is the page's whole argument:
 *
 *   • SIZE is driven by the real live feedCount through the real formula from
 *     build/src/mochi/creature.ts. When the number on the endpoint moves, this
 *     blob is physically bigger. Nothing here is a decorative multiplier.
 *   • COLOUR is driven by real hunger. creature.ts lerps albedo bodyLight →
 *     bodyDeep and sets emissiveIntensity = 0.12 + fed * 0.33. Same here.
 *   • MOTION is squash-and-stretch on a child group while scale lives on the
 *     parent — exactly the two-entity split the scene uses (root vs body) so
 *     growth and animation can never overwrite each other.
 *   • PET is a press, not a button, and it cannot fail. Same as in-world.
 */

interface MochiBlobProps {
  feedCount: number;
  hunger: number;
  /** Pressing squashes the creature. Off for small decorative instances. */
  interactive?: boolean;
  className?: string;
  onPet?: () => void;
}

/**
 * How the creature answers a pet.
 *
 * Six of them, because one was a button and six is a creature. Durations are
 * carried here rather than assumed, since the timer that hands the body back to
 * the breathing loop has to match the animation that is actually playing — a
 * shared constant would cut the spin off a third of the way through.
 */
const REACTIONS = [
  { cls: "react-squash", ms: 620 },
  { cls: "react-lean-left", ms: 700 },
  { cls: "react-lean-right", ms: 700 },
  { cls: "react-spin", ms: 900 },
  { cls: "react-hop", ms: 760 },
  { cls: "react-wobble", ms: 820 },
] as const;

/** Rings are cheap, but a held-down thumb should not spawn them without limit. */
const MAX_RINGS = 5;

/** creature.ts body gradient stops, from assets/_tokens.css. */
const BODY_LIGHT = { r: 0xff, g: 0xd9, b: 0xe8 }; // --primary-soft
const BODY_DEEP = { r: 0xff, g: 0xc2, b: 0xdc }; // --primary

function lerpHex(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
) {
  const c = Math.max(0, Math.min(1, t));
  const mix = (x: number, y: number) => Math.round(x + (y - x) * c);
  return `rgb(${mix(a.r, b.r)}, ${mix(a.g, b.g)}, ${mix(a.b, b.b)})`;
}

export function MochiBlob({
  feedCount,
  hunger,
  interactive = false,
  className,
  onPet,
}: MochiBlobProps) {
  const uid = useId().replace(/:/g, "");
  /**
   * `nonce` exists to restart the animation, not to describe it.
   *
   * Re-applying the same class does not replay a CSS animation, so pressing
   * twice and drawing the same reaction would have looked like the press did
   * nothing. Keying the animated group on the nonce remounts it, which is the
   * one restart that is guaranteed regardless of which reaction came up.
   */
  const [reaction, setReaction] = useState<{ cls: string; nonce: number } | null>(null);
  const [rings, setRings] = useState<number[]>([]);
  const ringSeq = useRef(0);
  const nonceSeq = useRef(0);
  const lastReaction = useRef(-1);
  /**
   * The timer that ends the current reaction.
   *
   * Held in a ref and cancelled on every press. Without that, a press at 300ms
   * inherited the previous press's 620ms timer, which then stripped the class
   * off a third of the way through the new animation — so pressing quickly made
   * the creature twitch and snap rather than react.
   */
  const endTimer = useRef<number | null>(null);

  // fed: 1.0 is a full belly, HUNGER.floor is as empty as it is allowed to get.
  const fed = Math.max(HUNGER.floor, Math.min(1, hunger));
  const scale = scaleForFeedCount(feedCount);
  const emissive = 0.12 + fed * 0.33;
  const bodyDeep = lerpHex(BODY_LIGHT, BODY_DEEP, fed);

  const pet = useCallback(() => {
    if (!interactive) return;

    // Never the same reaction twice running: a repeat reads as a stuck
    // animation rather than as a second answer.
    let index = Math.floor(Math.random() * REACTIONS.length);
    if (index === lastReaction.current) index = (index + 1) % REACTIONS.length;
    lastReaction.current = index;
    const picked = REACTIONS[index]!;

    if (endTimer.current !== null) window.clearTimeout(endTimer.current);
    setReaction({ cls: picked.cls, nonce: nonceSeq.current++ });
    endTimer.current = window.setTimeout(() => {
      setReaction(null);
      endTimer.current = null;
    }, picked.ms);

    const id = ringSeq.current++;
    setRings((r) => [...r, id].slice(-MAX_RINGS));
    window.setTimeout(
      () => setRings((r) => r.filter((existing) => existing !== id)),
      900,
    );
    onPet?.();
  }, [interactive, onPet]);

  // A creature mid-hop when the section unmounts should not leave a timer
  // behind trying to set state on it.
  useEffect(
    () => () => {
      if (endTimer.current !== null) window.clearTimeout(endTimer.current);
    },
    [],
  );

  const handleKey = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        pet();
      }
    },
    [pet],
  );

  // The viewBox is sized for the maximum possible creature (1.9x) so growth
  // never clips and the blob visibly has room left to grow into.
  return (
    <div className={className}>
      <svg
        viewBox="0 0 420 380"
        className="h-full w-full overflow-visible"
        role={interactive ? "button" : "img"}
        tabIndex={interactive ? 0 : undefined}
        aria-label={
          interactive
            ? `Mochi, fed ${feedCount} times and therefore ${scale.toFixed(2)} times its starting size. Press to pet it.`
            : `Mochi, a pastel blob, ${scale.toFixed(2)} times its starting size`
        }
        onPointerDown={pet}
        onKeyDown={interactive ? handleKey : undefined}
        style={{ cursor: interactive ? "grab" : undefined, touchAction: "manipulation" }}
      >
        <defs>
          <radialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff8fb1" stopOpacity={emissive} />
            <stop offset="100%" stopColor="#ff8fb1" stopOpacity="0" />
          </radialGradient>

          <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0%" stopColor="#ffe7f1" />
            <stop offset="55%" stopColor={bodyDeep} />
            <stop offset="100%" stopColor={bodyDeep} />
          </linearGradient>

          <radialGradient id={`sheen-${uid}`} cx="34%" cy="26%" r="42%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>

          <radialGradient id={`shadow-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5c8f76" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#5c8f76" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Emissive halo — the scene's emissiveIntensity, as light on the meadow */}
        <ellipse
          cx="210"
          cy="200"
          rx={150 * scale}
          ry={140 * scale}
          fill={`url(#glow-${uid})`}
        />

        {/* Contact shadow, scaled with the creature so weight reads correctly */}
        <ellipse
          cx="210"
          cy="322"
          rx={112 * scale}
          ry={26 * scale}
          fill={`url(#shadow-${uid})`}
        />

        {/* ROOT — carries growth only, never tweened. Mirrors the scene's split. */}
        <g transform={`translate(210 318) scale(${scale}) translate(-210 -318)`}>
          {/* BODY — carries all animation, never scaled by growth. */}
          <g
            key={reaction?.nonce ?? "idle"}
            className={reaction ? `reacting ${reaction.cls}` : "breathing"}
          >
            <ellipse
              cx="210"
              cy="212"
              rx="112"
              ry="98"
              fill={`url(#body-${uid})`}
              stroke="#7a5165"
              strokeWidth="9"
            />
            <ellipse
              cx="210"
              cy="212"
              rx="112"
              ry="98"
              fill={`url(#sheen-${uid})`}
            />

            {/* Plane eyes — exactly two rounded rects, as in the scene */}
            <g className="blinking">
              <rect
                x="163"
                y="192"
                width="20"
                height="38"
                rx="10"
                fill="#7a5165"
              />
              <rect
                x="237"
                y="192"
                width="20"
                height="38"
                rx="10"
                fill="#7a5165"
              />
            </g>

            {/* A mouth that deepens as the belly fills */}
            <path
              d={`M 194 250 Q 210 ${250 + 12 * fed} 226 250`}
              fill="none"
              stroke="#7a5165"
              strokeWidth="7"
              strokeLinecap="round"
            />

            {/* Blush, brightening with the credited accent as it is fed */}
            <ellipse
              cx="146"
              cy="242"
              rx="17"
              ry="11"
              fill="#ff8fb1"
              opacity={0.25 + fed * 0.4}
            />
            <ellipse
              cx="274"
              cy="242"
              rx="17"
              ry="11"
              fill="#ff8fb1"
              opacity={0.25 + fed * 0.4}
            />
          </g>
        </g>

        {/* Pet feedback rings */}
        {rings.map((id) => (
          <circle
            key={id}
            cx="210"
            cy="212"
            r={120 * scale}
            fill="none"
            stroke="#b2436a"
            strokeWidth="4"
            style={{
              transformBox: "fill-box",
              transformOrigin: "center",
              animation: "pulse-ring 0.9s ease-out forwards",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export { GROWTH };
