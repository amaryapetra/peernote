import type { Metadata } from "next";
import Link from "next/link";
import { Badge, ButtonLink } from "@/components/ui";
import { SITE_URL } from "@/lib/env";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const FEATURES = [
  {
    title: "Catch up on a missed class",
    body: "Pick the date you missed. PeerNote combines every classmate's notes from that lecture into one organized study guide, with sources.",
    tag: "AI",
  },
  {
    title: "Fill the gaps in your notes",
    body: "Compare your notes with your classmates' from the same lecture. See the concepts you missed, explained, and where they came from.",
    tag: "AI",
  },
  {
    title: "Ask your class's notes",
    body: "Ask a question and get an answer grounded in what your class actually wrote down, with citations back to the notes.",
    tag: "AI",
  },
  {
    title: "Find a study partner",
    body: "Get matched with classmates who share your courses, free time, and study style. Connect, then swap contact info.",
    tag: "Matching",
  },
  {
    title: "Course study groups",
    body: "Start or join a small group for a course, set a time and place, and keep the plan in one thread.",
    tag: "Groups",
  },
  {
    title: "Snap a photo of handwritten notes",
    body: "Upload a photo or PDF and PeerNote turns it into clean, searchable text you can edit before sharing.",
    tag: "AI",
  },
];

const STEPS = [
  { n: "1", title: "Join your courses", body: "Search for your class and enter a classmate's invite code, or create a new course." },
  { n: "2", title: "Share notes after lecture", body: "Type, paste, or photograph your notes. Each upload gets a quick academic-integrity check." },
  { n: "3", title: "Study smarter together", body: "Fill gaps, catch up on missed days, and meet up with classmates who study the way you do." },
];

const FAQ = [
  {
    q: "Is PeerNote free?",
    a: "Yes. PeerNote is a student project and is free to use.",
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
    q: "How does the AI know what I missed?",
    a: "When you ask, PeerNote sends your notes and your classmates' notes from the same lecture to Claude, an AI model by Anthropic. It lists the ideas your classmates captured that you didn't, with explanations and links to the source notes.",
  },
];

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden>
      <div className="absolute -left-4 -top-4 h-full w-full rotate-[-3deg] rounded-2xl border border-line bg-surface-2" />
      <div className="relative rounded-2xl border border-line bg-surface p-5 shadow-xl shadow-black/5">
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="font-medium text-ink">ECON 3010 · Intermediate Micro</span>
          <span>Tue, Oct 13</span>
        </div>
        <h3 className="mt-3 font-display text-lg font-semibold">Consumer choice and utility</h3>
        <ul className="mt-3 space-y-1.5 text-sm text-muted">
          <li>• Budget line: p₁x₁ + p₂x₂ = m</li>
          <li>• Indifference curves can&apos;t cross</li>
          <li>• Optimum where MRS = p₁ / p₂</li>
        </ul>
        <div className="mt-5 rounded-xl border border-line bg-brand-soft p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-strong">
            <span className="inline-block size-2 rounded-full bg-brand" />
            2 ideas your classmates caught
          </div>
          <ul className="mt-2 space-y-2 text-sm">
            <li>
              <span className="mark font-medium">Corner solutions</span>
              <span className="text-muted"> happen when the consumer buys only one good, so MRS ≠ price ratio.</span>
            </li>
            <li>
              <span className="mark font-medium">Problem set 4</span>
              <span className="text-muted"> moved to Thursday.</span>
            </li>
          </ul>
          <p className="mt-2 text-xs text-muted">From Maya&apos;s and Jordan&apos;s notes</p>
        </div>
      </div>
    </div>
  );
}

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
        "Share class notes with classmates, catch up on missed lectures with AI study guides, and find study partners in your courses.",
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

      <section className="ruled border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <Badge tone="highlight">For college students, by college students</Badge>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Never miss what was said in <span className="mark">class</span> again.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              PeerNote is where classmates share lecture notes, fill each other&apos;s gaps with AI, and find people to
              study with. Missed a lecture? Your class has you covered.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" size="lg">
                Get started free
              </ButtonLink>
              <ButtonLink href="/#how-it-works" variant="secondary" size="lg">
                See how it works
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">Free. Notes stay private to your course.</p>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section id="problem" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h2 className="font-display text-2xl font-semibold">Studying alone is harder than it needs to be.</h2>
          </div>
          <p className="text-muted">
            If you don&apos;t already have friends in a class, it&apos;s hard to find someone to review with. And if you
            miss a lecture, you&apos;re stuck asking around for notes that may or may not exist.
          </p>
          <p className="text-muted">
            Even on days you&apos;re there, you can&apos;t write everything down. Someone else in the room caught the
            example you missed. PeerNote puts all of that in one place for each course.
          </p>
        </div>
      </section>

      <section id="features" className="border-y border-line bg-surface/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Everything your class knows, organized.</h2>
          <p className="mt-2 max-w-2xl text-muted">
            PeerNote combines note sharing, AI note comparison, course study groups, and classmate matching.
          </p>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="rounded-xl border border-line bg-surface p-5">
                <Badge tone={feature.tag === "AI" ? "brand" : "neutral"}>{feature.tag}</Badge>
                <h3 className="mt-3 font-display text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted">{feature.body}</p>
              </li>
            ))}
          </ul>
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
              a place for notes and study guides, never a test bank.
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
            Join your courses, share what you wrote down, and see what your classmates caught.
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
