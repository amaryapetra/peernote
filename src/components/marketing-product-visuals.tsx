import Image from "next/image";

/** A crisp, responsive reconstruction of the Courses interface.
 *  Rendering native text and borders avoids blurring a small raster screenshot.
 *  This is a UI preview rather than a claim that example records are live data.
 */
export function HeroPreview() {
  return (
    <div
      className="relative mx-auto w-full max-w-[610px]"
      role="img"
      aria-label="Preview of PeerNote Courses with class search, a semester folder, and a course card"
    >
      <div className="absolute -inset-4 rotate-[-3deg] rounded-[2rem] border border-line bg-surface-2/90" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl shadow-black/10">
        <div className="flex h-10 items-center gap-2 border-b border-line bg-surface px-4">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-[#e3a59c]" />
            <span className="size-2.5 rounded-full bg-[#efd88a]" />
            <span className="size-2.5 rounded-full bg-[#a2ccb5]" />
          </div>
          <span className="ml-3 text-xs font-medium text-muted">PeerNote / Courses</span>
        </div>
        <div className="space-y-5 px-5 pb-6 pt-5 sm:px-7 sm:pb-8 sm:pt-7">
          <div>
            <h2 className="font-display text-3xl font-semibold leading-tight text-ink">Courses</h2>
            <p className="mt-1 text-xs text-muted sm:text-sm">Find your classes. Study better together.</p>
          </div>
          <div>
            <p className="mb-2 font-display text-base font-semibold text-ink sm:text-lg">Find a course</p>
            <div className="flex min-w-0 gap-2">
              <span className="flex h-10 min-w-0 flex-1 items-center overflow-hidden rounded-md border border-line bg-surface px-3 text-xs text-muted sm:text-sm">
                Search by code, name, or professor
              </span>
              <span className="flex h-10 shrink-0 items-center rounded-md bg-brand px-3 text-xs font-medium text-on-brand">Search</span>
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold text-ink sm:text-lg">Your courses</h3>
              <span className="text-xs text-muted">1 course</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="flex items-center gap-2 border-b border-line px-3 py-3 sm:px-4">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0 text-brand" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2.3 2.5h6.2A2.5 2.5 0 0 1 21 10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Z" />
                </svg>
                <span className="flex-1 text-sm font-semibold text-ink">Fall 2026</span>
                <span className="text-xs text-muted">1 course</span>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
              <div className="p-3 sm:p-4">
                <div className="w-full max-w-[255px] rounded-lg border border-line bg-paper p-3.5 sm:p-4">
                  <p className="text-xs font-semibold text-brand">DATA 2150</p>
                  <p className="mt-1 font-display text-base font-semibold text-ink sm:text-lg">AI Tools</p>
                  <p className="mt-1 text-xs text-muted">Fall 2026</p>
                  <p className="mt-3 text-xs text-muted">Notes · Class materials · Study groups</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Pexels photography by Zen Chung (photo 5537513). For visual context only. */
export function StudyPhoto() {
  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="relative aspect-[5/4] sm:aspect-[4/3]">
        <Image
          src="https://images.pexels.com/photos/5537513/pexels-photo-5537513.jpeg?auto=compress&cs=tinysrgb&w=1000"
          alt="Two students studying together outdoors with a laptop and notebooks"
          width={1000}
          height={670}
          unoptimized
          sizes="(max-width: 768px) 100vw, 48vw"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    </figure>
  );
}

/** Example data in these feature cards is illustrative, never a screenshot of student notes. */
export function GapPreview() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-brand">FILL THE GAPS</span>
        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand-strong">AI comparison</span>
      </div>
      <div className="mb-3 rounded-lg border border-line bg-paper p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-ink">Your notes</span>
          <span className="text-xs text-muted">Lecture example</span>
        </div>
        <p className="text-sm leading-relaxed text-muted">Supply shifts when production costs change. Price and quantity adjust to a new equilibrium.</p>
      </div>
      <div className="rounded-lg border border-brand/15 bg-brand-soft p-3.5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-strong">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-brand text-xs text-on-brand">+</span>
          2 ideas your classmates caught
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-semibold text-ink">Short-run vs. long-run effects</p>
            <p className="mt-0.5 text-muted">How supply responds differently over time.</p>
          </div>
          <div className="border-t border-brand/10 pt-3">
            <p className="font-semibold text-ink">Movement vs. a shift</p>
            <p className="mt-0.5 text-muted">A price change moves along the curve; other factors shift it.</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted">Illustrative AI output · not real student notes</p>
    </div>
  );
}

export function CatchUpPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-brand">CATCH UP</span>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-muted">Lecture example</span>
      </div>
      <div className="border-l-2 border-highlight-ink/50 pl-4">
        <span className="text-xs font-medium text-muted">Tuesday · Oct 13</span>
        <h3 className="mt-1 font-display text-xl font-semibold text-ink">Consumer choice & utility</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Your class covered how consumers compare bundles of goods, work within a budget, and choose their preferred option.
        </p>
      </div>
      <div className="mt-4 grid gap-2">
        <div className="flex gap-3 rounded-lg bg-paper px-3 py-2.5 text-sm">
          <span className="font-semibold text-brand">01</span>
          <span className="text-ink">Budget constraints & tradeoffs</span>
        </div>
        <div className="flex gap-3 rounded-lg bg-paper px-3 py-2.5 text-sm">
          <span className="font-semibold text-brand">02</span>
          <span className="text-ink">Indifference curves</span>
        </div>
        <div className="flex gap-3 rounded-lg bg-paper px-3 py-2.5 text-sm">
          <span className="font-semibold text-brand">03</span>
          <span className="text-ink">Finding the optimal bundle</span>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted">Illustrative guide · generated from fictional example notes</p>
    </div>
  );
}
