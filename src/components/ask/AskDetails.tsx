import { AskInfoButton } from "@/components/ask/AskInfoButton";
import { VerificationBadge } from "@/components/ui/Badge";
import type { Ask } from "@/lib/types";

const LABEL = "text-[11px] uppercase tracking-[0.16em] text-text-muted";

/**
 * Everything the share card leaves out, for someone who came to look an ask up:
 * who answers for it, how it would happen, its tags and its verification state.
 * Sits below ShareCard because that card mirrors the OG image and stays minimal.
 */
export function AskDetails({ ask }: { ask: Ask }) {
  const people = ask.responsiblePeople ?? [];
  const tags = ask.tags ?? [];

  return (
    <div className="bg-card border border-border rounded-card p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <VerificationBadge status={ask.verificationStatus} />
        <span className="flex items-center gap-2 text-[13px] text-text-secondary">
          Full brief
          <AskInfoButton ask={ask} />
        </span>
      </div>

      {(ask.targetBody || people.length > 0) && (
        <div className="flex flex-col gap-2">
          <span className={LABEL}>Who&rsquo;s responsible</span>
          {ask.targetBody && <p className="text-[15px] text-text">{ask.targetBody}</p>}
          {people.length > 0 && (
            <ul className="flex flex-col divide-y divide-border border border-border rounded-sm">
              {people.map((person) => (
                <li key={person.name} className="px-4 py-3">
                  <p className="text-[15px] font-semibold text-text">{person.name}</p>
                  <p className="text-[13px] text-text-secondary leading-snug mt-0.5">
                    {person.designation}
                    {person.organization && (
                      <>
                        <span className="text-text-muted"> · </span>
                        {person.organization}
                      </>
                    )}
                  </p>
                  {person.twitterHandle && (
                    <a
                      href={`https://x.com/${person.twitterHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-accent hover:underline underline-offset-4"
                    >
                      @{person.twitterHandle}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {ask.mechanism && (
        <div className="flex flex-col gap-2">
          <span className={LABEL}>How it would happen</span>
          <p className="text-[15px] text-text-secondary leading-relaxed">{ask.mechanism}</p>
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className={LABEL}>Tags</span>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-sm bg-paper border border-border text-text-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
