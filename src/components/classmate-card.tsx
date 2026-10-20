import { respondToConnection, sendConnectionRequest } from "@/app/actions/connections";
import { AVAILABILITY, labelFor } from "@/lib/constants";
import type { Classmate } from "@/lib/partners";
import { SubmitButton } from "./form";
import { Avatar, Badge, ButtonLink, inputClass } from "./ui";

export function ClassmateCard({ classmate, courseId }: { classmate: Classmate; courseId?: string }) {
  const { profile, result, connection, name } = classmate;
  const scoreTone = result.score >= 70 ? "success" : result.score >= 45 ? "brand" : "neutral";
  return (
    <li className="flex flex-col rounded-xl border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <Avatar name={name} id={profile.id} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{name}</p>
          <p className="truncate text-sm text-muted">
            {[profile.major, profile.grad_year ? `Class of ${profile.grad_year}` : ""].filter(Boolean).join(" · ") || "Student"}
          </p>
        </div>
        <Badge tone={scoreTone} title="Match score based on shared classes, free time, and study style">
          {result.score}% match
        </Badge>
      </div>

      {profile.bio && <p className="mt-3 line-clamp-3 text-sm text-muted">{profile.bio}</p>}

      {result.reasons.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {result.reasons.map((r) => (
            <li key={r} className="flex gap-2">
              <span aria-hidden className="text-success">✓</span>
              {r}
            </li>
          ))}
        </ul>
      )}
      {result.sharedTimes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {result.sharedTimes.map((t) => (
            <Badge key={t}>{labelFor(AVAILABILITY, t)}</Badge>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4">
        {connection.kind === "none" && (
          <details className="group">
            <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-lg bg-brand px-3 text-sm font-medium text-on-brand hover:bg-brand-strong">
              Ask to study together
            </summary>
            <form action={sendConnectionRequest} className="mt-3 space-y-2">
              <input type="hidden" name="userId" value={profile.id} />
              {courseId && <input type="hidden" name="courseId" value={courseId} />}
              <label htmlFor={`msg-${profile.id}`} className="sr-only">
                Message
              </label>
              <textarea
                id={`msg-${profile.id}`}
                name="message"
                rows={2}
                maxLength={300}
                className={inputClass}
                placeholder="Optional note, like “Want to review for the midterm Thursday?”"
              />
              <SubmitButton size="sm" pendingText="Sending…">
                Send request
              </SubmitButton>
            </form>
          </details>
        )}
        {connection.kind === "sent" && <p className="text-sm text-muted">Request sent. Waiting for {name.split(" ")[0]} to respond.</p>}
        {connection.kind === "declined" && <p className="text-sm text-muted">Not connected.</p>}
        {connection.kind === "connected" && (
          <ButtonLink href="/partners#connections" variant="secondary" size="sm">
            Connected · see contact info
          </ButtonLink>
        )}
        {connection.kind === "received" && (
          <div className="space-y-2">
            <p className="text-sm">
              <span className="font-medium">{name.split(" ")[0]}</span> wants to study with you
              {connection.message ? `: “${connection.message}”` : "."}
            </p>
            <form action={respondToConnection} className="flex gap-2">
              <input type="hidden" name="connectionId" value={connection.id} />
              <SubmitButton size="sm" name="decision" value="accept">
                Accept
              </SubmitButton>
              <SubmitButton size="sm" variant="ghost" name="decision" value="decline">
                Decline
              </SubmitButton>
            </form>
          </div>
        )}
      </div>
    </li>
  );
}
