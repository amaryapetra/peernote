import Image from "next/image";

/** Cropped from a real PeerNote course screenshot with account details excluded. */
export function HeroPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-[610px]">
      <div className="absolute -inset-4 rotate-[-3deg] rounded-[2rem] border border-line bg-surface-2/90" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl shadow-black/10">
        <div className="flex h-10 items-center gap-2 border-b border-line bg-surface px-4">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-[#e3a59c]" />
            <span className="size-2.5 rounded-full bg-[#efd88a]" />
            <span className="size-2.5 rounded-full bg-[#a2ccb5]" />
          </div>
          <span className="ml-3 text-xs font-medium text-muted">PeerNote / Courses</span>
          <span className="ml-auto rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-semibold text-brand-strong">
            Actual app
          </span>
        </div>
        <Image
          src="/images/peernote-courses.webp"
          alt="PeerNote Courses page with class search and an enrolled course card"
          width={530}
          height={300}
          priority
          sizes="(max-width: 1024px) 90vw, 550px"
          className="block h-auto w-full"
        />
      </div>
      <figcaption className="relative mt-4 text-center text-xs text-muted">
        Screenshot from PeerNote · earlier version of the Courses page
      </figcaption>
    </figure>
  );
}

/** A licensed photograph of students studying; not presented as Tulane users. */
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
      <figcaption className="px-4 py-2 text-xs text-muted">
        Illustrative photography by{" "}
        <a href="https://www.pexels.com/photo/multiracial-students-with-laptop-doing-homework-at-table-5537513/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-brand">
          Zen Chung / Pexels
        </a>. Not PeerNote members or Tulane students.
      </figcaption>
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
