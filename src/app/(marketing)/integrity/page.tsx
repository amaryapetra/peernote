import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Academic integrity",
  description:
    "What you can and can't share on PeerNote, and how every upload is screened so PeerNote never works as a test bank.",
  alternates: { canonical: "/integrity" },
};

export default function IntegrityPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Academic integrity</h1>
      <p className="mt-4 text-lg text-muted">
        PeerNote exists to help you learn from your classmates. It is not, and will never be, a place to share exam
        answers.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <section className="rounded-xl border border-success/30 bg-success-soft p-5">
          <h2 className="font-display text-xl font-semibold">Share this</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
            <li>Notes you took during or after lecture</li>
            <li>Worked examples your professor did in class</li>
            <li>Your own outlines, summaries, and concept maps</li>
            <li>Flashcards or practice questions you wrote yourself</li>
            <li>Announcements, like &ldquo;the midterm covers chapters 1 to 4&rdquo;</li>
          </ul>
        </section>
        <section className="rounded-xl border border-danger/30 bg-danger-soft p-5">
          <h2 className="font-display text-xl font-semibold">Never share this</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
            <li>Questions or answers from a real quiz, test, or exam, even from memory</li>
            <li>Answer keys or test banks</li>
            <li>Full solutions to homework that&apos;s currently graded</li>
            <li>Anything your professor has said not to share</li>
          </ul>
        </section>
      </div>

      <section className="mt-12 space-y-4">
        <h2 className="font-display text-2xl font-semibold">How screening works</h2>
        <p className="text-muted">
          Every time a note is saved, PeerNote checks it before sharing. A fast scan looks for red flags such
          as answer keys, point values, and exam versions. When AI screening is configured, an AI model also
          checks the full note. If that AI check is temporarily unavailable, the note is not saved and you
          can retry. Without an AI key configured, only the keyword scan runs. Automated checks are not
          foolproof; please share only material your instructor permits.
        </p>
        <p className="text-muted">
          Students cannot directly insert notes through the database API. Uploads pass through PeerNote&apos;s server
          and its configured screening before they are shared.
        </p>
        <p className="text-muted">
          The AI features also follow these rules. If you ask a question that looks like it&apos;s from a live quiz or
          assignment, PeerNote will offer to explain the concept instead of giving you the answer.
        </p>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="font-display text-2xl font-semibold">Your school&apos;s rules come first</h2>
        <p className="text-muted">
          Every course and school has its own honor code. If your professor doesn&apos;t allow sharing notes for their
          class, don&apos;t. When in doubt, ask.
        </p>
      </section>
    </article>
  );
}
