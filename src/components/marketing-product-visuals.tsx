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
                  <p className="text-xs font-semibold text-brand">ECON 1010</p>
                  <p className="mt-1 font-display text-base font-semibold text-ink sm:text-lg">Intro to Microeconomics</p>
                  <p className="mt-1 text-xs text-muted">Fall 2026</p>
                  <p className="mt-3 text-xs text-muted">Notes · Class materials · Study groups · Video call</p>
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
export function LectureNotesPreview() {
  const notes = [
    { title: "Supply shifts and equilibrium", who: "Maya", helpful: 6 },
    { title: "Short run vs. long run, with graphs", who: "Jordan", helpful: 4 },
    { title: "Lecture 9 notes + worked example", who: "Sam", helpful: 2 },
  ];
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-brand">MISSED CLASS</span>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-muted">Tuesday · Oct 13</span>
      </div>
      <p className="mb-3 text-sm font-semibold text-ink">3 classmates shared notes from this lecture</p>
      <ul className="space-y-2">
        {notes.map((note) => (
          <li key={note.title} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper px-3 py-2.5 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium text-ink">{note.title}</span>
              <span className="text-xs text-muted">{note.who}</span>
            </span>
            <span className="shrink-0 text-xs text-muted">★ {note.helpful} helpful</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted">Illustrative example · not real student notes</p>
    </div>
  );
}

export function StudyGroupPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-brand">STUDY GROUP</span>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-muted">4/6 members</span>
      </div>
      <div className="border-l-2 border-highlight-ink/50 pl-4">
        <h3 className="font-display text-xl font-semibold text-ink">Midterm 2 review crew</h3>
        <p className="mt-1 text-sm text-muted">Thu, Oct 22 · 7:00 PM CT · Howard-Tilton, 3rd floor</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded-lg bg-brand px-3 py-1.5 font-medium text-on-brand">Going</span>
        <span className="rounded-lg border border-line px-3 py-1.5 text-muted">Maybe</span>
        <span className="rounded-lg border border-line px-3 py-1.5 text-muted">Add to calendar</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2.5 text-sm">
        <span className="text-ink">Can&apos;t make it in person?</span>
        <span className="font-medium text-brand">Join the class video call</span>
      </div>
      <p className="mt-3 text-[11px] text-muted">Illustrative example</p>
    </div>
  );
}
