import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why we built PeerNote, how it works under the hood, and the Tulane student team behind it.",
  alternates: { canonical: "/about" },
};

const TEAM = [
  { name: "Amelia", role: "Project management" },
  { name: "Avi", role: "Project management" },
  { name: "Emily", role: "Frontend and design" },
  { name: "Amarya", role: "Frontend and design" },
  { name: "Miles", role: "Backend, testing, and deployment" },
  { name: "Danny", role: "Backend, testing, and deployment" },
];

const STACK = [
  { name: "Next.js", detail: "React framework for the pages and server logic, written in TypeScript." },
  { name: "Supabase", detail: "Postgres database, user accounts, and row-level security that keeps each course's notes private to its students." },
  { name: "Claude by Anthropic", detail: "The AI model behind note comparison, catch-up guides, answers, transcription, and integrity screening." },
  { name: "Vercel", detail: "Hosting, deployed automatically from GitHub, served on our own domain." },
];

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-semibold tracking-tight">About PeerNote</h1>
      <p className="mt-4 text-lg text-muted">
        PeerNote started with a problem every college student knows: it&apos;s hard to find people to study with if you
        don&apos;t already have friends in a class, and if you miss a lecture, getting good notes depends on who you
        happen to know.
      </p>

      <section className="mt-12 space-y-4">
        <h2 className="font-display text-2xl font-semibold">What we believe</h2>
        <p className="text-muted">
          Students learn more together. Research on peer learning consistently finds that explaining ideas to each other
          and comparing understanding improves outcomes. Your classmates already have the pieces you&apos;re missing. We
          wanted to make swapping those pieces easy, and to make it just as easy to find the right person to study with.
        </p>
        <p className="text-muted">
          We also believe a tool like this has to protect academic integrity. That&apos;s why every upload is screened,
          and why PeerNote will never be a place to trade exam answers.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">How it&apos;s built</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {STACK.map((item) => (
            <li key={item.name} className="rounded-xl border border-line bg-surface p-4">
              <h3 className="font-medium">{item.name}</h3>
              <p className="mt-1 text-sm text-muted">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">The team</h2>
        <p className="mt-2 text-muted">Six Tulane students who wanted a better way to study together.</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {TEAM.map((person) => (
            <li key={person.name} className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3">
              <span className="font-medium">{person.name}</span>
              <span className="text-sm text-muted">{person.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12">
        <ButtonLink href="/signup" size="lg">
          Join PeerNote
        </ButtonLink>
      </div>
    </article>
  );
}
