import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What PeerNote stores, who can see it, and how AI features use your notes.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-16 sm:px-6">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Privacy</h1>
        <p className="mt-4 text-lg text-muted">The short version: your notes are for your classmates, not the internet.</p>
      </header>
      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">What we store</h2>
        <p className="text-muted">
          Your name, email, and the profile details you choose to add (major, graduation year, study style, and when
          you&apos;re free). The courses you join, the notes and authorized class materials you share (including file storage), study groups,
          connection requests, and the AI results you generate so you can come back to them later.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Who can see what</h2>
        <ul className="list-disc space-y-2 pl-5 text-muted">
          <li>Notes, study groups, and the class roster are visible to users who join the course. Joining a course requires a private 12-character invite code. PeerNote does not independently verify university enrollment.</li>
          <li>Uploaded lecture materials are stored in private course storage. Only enrolled course members can open them through time-limited links. Canvas links still require Canvas permission.</li>
          <li>Your profile is visible to classmates in your courses.</li>
          <li>Your contact info is visible only to classmates whose connection request you&apos;ve accepted, or who accepted yours.</li>
          <li>Your AI results (gap checks, catch-up guides, questions) are visible only to you.</li>
        </ul>
        <p className="text-muted">These rules are enforced by the database itself, not just by the website.</p>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">AI processing</h2>
        <p className="text-muted">
          When you use an AI feature, the relevant notes and any uploaded slides explicitly opted into AI analysis are sent to Anthropic&apos;s Claude API to generate the result. Links to Canvas are not fetched for AI analysis.
          Anthropic does not use API data to train its models by default.
        </p>
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Deleting your data</h2>
        <p className="text-muted">
          You can delete notes and materials you&apos;ve shared, leave courses and groups, and remove connections at any time. To
          delete your account entirely, contact the PeerNote team.
        </p>
      </section>
    </article>
  );
}
