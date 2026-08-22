/**
 * THE PROBLEM — the only dark section on the page.
 *
 * The design tokens are explicit that night is a state, not the theme. So this
 * is the single place the page goes dark, and it goes dark because the section
 * is literally about opening your phone at 2am to an empty room. The contrast
 * does the argument's work: everything before and after it is daylight.
 */
export function Problem() {
  return (
    <section className="relative px-5 py-6 sm:px-8">
      <div className="grain relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#2b2d5c] px-6 py-16 shadow-[0_30px_80px_rgba(43,45,92,0.28)] sm:px-14 sm:py-24">
        {/* a few far-off stars, and one window still lit */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70">
          {[
            [12, 22], [28, 12], [44, 30], [63, 16], [78, 34], [88, 20],
            [21, 62], [55, 74], [72, 58], [35, 86], [92, 68], [8, 44],
          ].map(([left, top], i) => (
            <span
              key={i}
              className="absolute h-[3px] w-[3px] rounded-full bg-[#fff4e6]"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                opacity: 0.18 + ((i * 7) % 5) * 0.11,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-center">
          <div className="reveal">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#ffb3c9]">
              The problem
            </p>
            <h2 className="mt-4 text-[clamp(2rem,5.2vw,3.2rem)] font-black text-[#fff4e6]">
              A world with nobody in it tells you nothing.
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-[#c9bedaee]">
              <p>
                Decentraland&rsquo;s worlds are{" "}
                <em className="not-italic font-bold text-[#fff4e6]">venues</em> —
                wonderful when full, dead when empty, which is almost always.
              </p>
              <p>
                You arrive alone, find an empty room, and nothing tells you
                anyone was ever there or cared. Presence is the only content,
                and presence is scarce.
              </p>
            </div>
          </div>

          <div
            className="reveal rounded-3xl border border-[#fff4e6]/12 bg-[#35376b]/70 p-7 backdrop-blur-sm sm:p-9"
            style={{ ["--reveal-delay" as string]: "140ms" }}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#ffb3c9]">
              The fix
            </p>
            <p className="mt-4 text-xl leading-relaxed text-[#fff4e6] sm:text-[1.35rem]">
              Mochi carries the room&rsquo;s history{" "}
              <span className="font-black text-[#ffb3c9]">in its body</span>{" "}
              instead.
            </p>
            <p className="mt-5 leading-relaxed text-[#c9bedaee]">
              Someone opens Decentraland on their phone at 2am because they
              can&rsquo;t sleep, and something strangers have been keeping alive
              is hungry — and it walks over to them.
            </p>
            <p className="mt-5 leading-relaxed text-[#c9bedaee]">
              A visitor alone at 2am both{" "}
              <span className="font-bold text-[#fff4e6]">receives</span>{" "}
              evidence of other people and{" "}
              <span className="font-bold text-[#fff4e6]">leaves</span> state the
              next visitor inherits.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {["No host", "No schedule", "No co-presence"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#ffb3c9]/30 px-3.5 py-1.5 text-xs font-bold text-[#ffb3c9]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
