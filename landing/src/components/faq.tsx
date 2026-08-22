import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PERF_SCORE_PENDING, WORLD_URL_PENDING } from "@/lib/mochi";

/**
 * ELEMENT 9 — FAQ.
 *
 * These are the questions a judge actually asks, including the awkward ones
 * (is it live? does it have users? is the score real?). Answering those in
 * public, in the project's own voice, is worth far more than dodging them.
 *
 * Two columns on desktop so the section does not become a long thin ribbon.
 */

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Can I go and see it right now?",
    a: (
      <>
        <p>
          Not yet. Mochi is a Decentraland World, and the World has not been
          granted to DCL Regenesis Labs at the time of writing — so there is
          genuinely no URL to give you, and we would rather say that than
          invent one. The placeholder on this page is literally{" "}
          <code className="rounded bg-[#ffe8f1] px-1.5 py-0.5 font-mono text-[0.85em] text-[#b2436a]">
            {WORLD_URL_PENDING}
          </code>
          .
        </p>
        <p>
          What you <em>can</em> do today is watch the real creature. The
          authoritative server is live, and the numbers on this page are read
          from it.
        </p>
      </>
    ),
  },
  {
    q: "How many people have actually used it?",
    a: (
      <p>
        One. The counters on this page read the live server, so they show the
        real figure rather than a flattering one, and they will update
        themselves the moment more people arrive. Seeding real carers is
        blocked on the same World grant.
      </p>
    ),
  },
  {
    q: "What stops the creature from dying if nobody visits?",
    a: (
      <p>
        Hunger drains from full to a floor of 15% over 36 hours and then stops.
        It is derived from a stored timestamp on every read rather than ticked
        by a timer, so nothing drifts and a redeploy loses nothing. One test
        sweeps 78,482 combinations of the hunger model, and none of them
        produces a creature that starves. Mochi is meant to read as needy, never
        as dying or abandoned.
      </p>
    ),
  },
  {
    q: "Is any of this on-chain?",
    a: (
      <p>
        No, and deliberately. There is no contract, no token, no external API
        and no AI model — the provider cost is $0.00 and there is exactly one
        runtime dependency. State lives in SQLite via Node&rsquo;s built-in{" "}
        <code className="rounded bg-[#ffe8f1] px-1.5 py-0.5 font-mono text-[0.85em] text-[#b2436a]">
          node:sqlite
        </code>{" "}
        on a single authoritative server. Identity comes from your Decentraland
        wallet, which is the only thing that needs to be a wallet.
      </p>
    ),
  },
  {
    q: "Can someone erase the move I taught?",
    a: (
      <p>
        No. The chain is append-only — there is no delete verb anywhere in the
        server, and the teacher&rsquo;s name is a non-null column at the schema
        level. Your wearables are captured at the moment you teach, so the ghost
        dancer keeps wearing what you wore that day even if you change outfit
        later.
      </p>
    ),
  },
  {
    q: "What happens when the chain gets very long?",
    a: (
      <p>
        Replay is capped at 24 moves and the server sends at most 40, but skipped
        moves are announced out loud rather than quietly dropped — Mochi says it
        is &ldquo;replaying the last 24 of 60 moves&rdquo;. The credit number
        shown is the stored sequence number, not a position in the visible list,
        so move #7 is always move #7.
      </p>
    ),
  },
  {
    q: "Will it run on my phone?",
    a: (
      <p>
        That is the whole target. The scene is procedural SDK7 primitives with
        zero imported GLB or GLTF models, which puts the deployable payload at
        6.6 MB against a 25 MB budget and keeps it under 250 entities against a
        4,800 soft limit. The ghost dancers degrade down a fidelity ladder — six
        avatars, then three, then floating nametags — and the chain, the credit
        and the order survive at every rung. The measured perf score on the
        target device is{" "}
        <code className="rounded bg-[#ffe8f1] px-1.5 py-0.5 font-mono text-[0.85em] text-[#b2436a]">
          {PERF_SCORE_PENDING}
        </code>{" "}
        — not yet run.
      </p>
    ),
  },
  {
    q: "Do I have to type anything?",
    a: (
      <p>
        Nothing, anywhere. Two thumb buttons, FEED and TEACH; petting is a press
        on the creature and signing the guestbook is one tap on a totem. Your
        display name comes from your wallet. Guests without a wallet can walk in
        and see everything, they just cannot leave a mark.
      </p>
    ),
  },
  {
    q: "Who built it?",
    a: (
      <p>
        DCL Regenesis Labs, for the DoraHacks Friendzone Buildathon. It is MIT
        licensed and the full source goes public at submission.
      </p>
    ),
  },
];

export function FAQ() {
  const columns = [FAQS.slice(0, 5), FAQS.slice(5)];

  return (
    <section id="faq" className="relative px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="reveal max-w-2xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#b2436a]">
            Questions
          </p>
          <h2 className="mt-4 text-[clamp(2.1rem,5.6vw,3.4rem)] font-black">
            Including the awkward ones.
          </h2>
        </div>

        <div className="mt-12 grid gap-x-10 gap-y-2 lg:grid-cols-2">
          {columns.map((column, colIndex) => (
            <Accordion
              key={colIndex}
              type="single"
              collapsible
              className="gap-2"
            >
              {column.map((faq) => (
                <AccordionItem
                  key={faq.q}
                  value={faq.q}
                  className="reveal overflow-hidden rounded-[1.5rem] border border-[#7a5165]/12 bg-[#fff1e0]/75 px-6 backdrop-blur-sm transition-colors duration-300 hover:border-[#ff8fb1]/45 not-last:border-b"
                >
                  <AccordionTrigger className="items-center gap-4 py-5 text-[1.05rem] font-black text-[#3b2a44] hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-[0.95rem] leading-relaxed text-[#5e4666]">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ))}
        </div>
      </div>
    </section>
  );
}
