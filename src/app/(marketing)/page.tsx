import type { Metadata } from "next";
import Link from "next/link";
import { Badge, ButtonLink } from "@/components/ui";
import { HeroPreview, LectureNotesPreview, StudyGroupPreview, StudyPhoto } from "@/components/marketing-product-visuals";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const MORE_FEATURES = [
  {
    tag: "Meet up",
    title: "Video calls with your class",
    body: "Every course has its own video room, so you can review together even when you can't meet in person.",
  },
  {
    tag: "Study together",
    title: "Find a study partner",
    body: "Connect with classmates who share your courses, availability, and study style.",
  },
  {
    tag: "Stay organized",
    title: "All your materials, one place",
    body: "Keep courses organized by semester and share notes, lecture slides, and permitted Canvas links.",
  },
];

const STEPS = [
  { n: "1", title: "Join your courses", body: "Search for your class and enter a classmate's invite code, or create a new course." },
  { n: "2", title: "Share what you learned", body: "Share your notes and permitted slides, or link directly to materials on Canvas." },
  { n: "3", title: "Study together", body: "Read classmates' notes, start a study group, hop on a video call, and find a study partner." },
];

const FAQ = [
  {
    q: "Is PeerNote free?",
    a: "Yes. PeerNote is a student project and is free to use.",
  },
  {
    q: "Who can join PeerNote?",
    a: "New accounts require a Tulane University email address ending in @tulane.edu. You'll need to confirm your email before using the app.",
  },
  {
    q: "Who can see my notes?",
    a: "Only users with an invite code who join the same course on PeerNote. Enrollment isn't verified by the university. Notes aren't public on the web, and contact info is only shared after you accept a connection request.",
  },
  {
    q: "Can I upload old exams or quiz answers?",
    a: "No. Every upload is checked, and anything that looks like real quiz, test, or exam questions or answer keys is rejected. PeerNote is for class notes and your own study materials, not a test bank.",
  },
  {
    q: "How do video calls work?",
    a: "Each course has its own video room on Jitsi Meet, a free video service. Only students in the course can see the room link in PeerNote. It opens in a new tab, with video, audio, chat, and screen sharing.",
  },
];

export default function HomePage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "PeerNote",
      url: SITE_URL,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any (web browser)",
      description:
        "Share class notes with classmates, catch up on missed lectures, join study groups and video calls, and find study partners in your courses.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <section className="relative overflow-hidden border-b border-line">
        <div className="ruled absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="pointer-events-none absolute right-[-15%] top-[-40%] size-[40rem] rounded-full bg-brand-soft/45 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[0.93fr_1.07fr] lg:py-24">
          <div>
            <Badge tone="highlight">Made for Tulane students</Badge>
            <h1 className="mt-5 max-w-xl font-display text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.55rem]">
              Miss a lecture? <span className="mark">Your class</span> has you covered.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Share notes, catch up on what you missed, and find classmates to study with.
              A better way to keep up, together.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" size="lg">Get started free</ButtonLink>
              <ButtonLink href="/#how-it-works" variant="secondary" size="lg">See how it works</ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">Free to use · Tulane email required · Course-private notes</p>
          </div>
          <HeroPreview />
        </div>
      </section>

      <section id="problem" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid items-center gap-9 md:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <StudyPhoto />
          <div className="space-y-4">
            <Badge tone="brand">A little help from your classmates</Badge>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Nobody catches everything in class.
            </h2>
            <p className="leading-relaxed text-muted">
              Some days you&apos;re absent. Other days you miss a formula or a professor&apos;s example.
              There shouldn&apos;t be a scramble through group chats just to piece together one lecture.
            </p>
            <p className="leading-relaxed text-muted">
              PeerNote brings classmates&apos; notes, permitted class materials, and study connections into each course,
              so you can spend less time searching and more time learning.
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-line bg-surface-2/35">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <Badge tone="highlight">See how PeerNote helps</Badge>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Built around the moments you need a hand.
            </h2>
            <p className="mt-3 text-muted">
              Go from scattered notes to a clearer picture of what your class covered.
            </p>
          </div>
          <div className="mt-10 grid items-center gap-8 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-8 lg:grid-cols-2 lg:gap-12">
            <div>
              <Badge tone="brand">01 · Catch up</Badge>
              <h3 className="mt-4 font-display text-2xl font-semibold">Missed class? Your classmates took notes.</h3>
              <p className="mt-3 leading-relaxed text-muted">
                Notes are organized by lecture date, so you can open the day you missed and read what everyone
                wrote down. The most helpful notes rise to the top.
              </p>
              <p className="mt-4 text-sm font-medium text-brand-strong">No more scrambling through group chats.</p>
            </div>
            <LectureNotesPreview />
          </div>
          <div className="mt-5 grid items-center gap-8 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-8 lg:grid-cols-2 lg:gap-12">
            <div className="lg:order-2">
              <Badge tone="brand">02 · Study together</Badge>
              <h3 className="mt-4 font-display text-2xl font-semibold">Plan a session. Show up, in person or on video.</h3>
              <p className="mt-3 leading-relaxed text-muted">
                Start a study group with a time and place, see who&apos;s going, and get a reminder before it starts.
                Every course also has its own video room for studying together remotely.
              </p>
              <p className="mt-4 text-sm font-medium text-brand-strong">Find your people in every class.</p>
            </div>
            <div className="lg:order-1"><StudyGroupPreview /></div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {MORE_FEATURES.map((feature) => (
              <article key={feature.title} className="rounded-xl border border-line bg-surface p-5">
                <span className="text-xs font-semibold uppercase tracking-widest text-brand">{feature.tag}</span>
                <h3 className="mt-3 font-display text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n} className="relative">
              <span className="font-display text-5xl font-semibold text-brand/30">{step.n}</span>
              <h3 className="mt-2 font-display text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-highlight/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-semibold">Built for learning, not cheating.</h2>
            <p className="mt-2 text-ink/80">
              Every upload is screened. Real quiz, test, and exam content is rejected before anyone sees it. PeerNote is
              for class notes and study guides, not a test bank.
            </p>
          </div>
          <ButtonLink href="/integrity" variant="secondary">
            Read our integrity policy
          </ButtonLink>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-3xl font-semibold tracking-tight">Questions</h2>
        <dl className="mt-8 divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <div key={item.q} className="py-5">
              <dt className="font-medium">{item.q}</dt>
              <dd className="mt-2 text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-2xl bg-brand px-6 py-12 text-center text-on-brand sm:px-12">
          <h2 className="font-display text-3xl font-semibold">Your next study session starts here.</h2>
          <p className="mx-auto mt-3 max-w-xl opacity-90">
            Join your courses, share what you wrote down, and see what your classmates caught. Sign up with your Tulane email.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex h-12 items-center rounded-lg bg-surface px-6 font-medium text-ink hover:bg-surface-2"
          >
            Create your free account
          </Link>
        </div>
      </section>
    </>
  );
}
