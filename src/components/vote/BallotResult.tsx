import { CopyBallotId } from "@/components/vote/BallotIdCard";
import { SaveBallotId } from "@/components/vote/SaveBallotId";
import { ballotYear, type LedgerBlock } from "@/lib/ledger";
import { cn } from "@/lib/cn";

export type BallotVote = { askId: string; askText: string | null; timeframe: string | null };
export type OpenBallot = { ballotId: string; blocks: LedgerBlock[]; votes: BallotVote[] };
export type Check = { ok: boolean; title: string; detail?: string };

const PENDING = ["Finding the ballot", "Comparing the votes", "Walking the ledger"];

function sealedOn(blocks: LedgerBlock[]) {
  return new Date(blocks[0].sealedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * The answer to "is this ballot real?", as a receipt: the verdict first, then
 * the votes, then the proof, with the raw hashes folded away for whoever wants
 * them. `checks` is null while the browser is still working it out.
 */
export function BallotResult({
  ballot,
  checks,
  onReset,
}: {
  ballot: OpenBallot;
  checks: Check[] | null;
  onReset: () => void;
}) {
  const { ballotId, blocks, votes } = ballot;
  const verified = checks?.every((c) => c.ok) ?? false;
  const failed = checks !== null && !verified;
  const year = ballotYear(ballotId);
  const noun = votes.length === 1 ? "vote" : "votes";

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-live="polite"
        className="bg-card border border-border rounded-card overflow-hidden"
      >
        {/* Perforated tear-off edge, the same ballot stub as "My votes". */}
        <div
          className="h-3"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, var(--color-ink) 0 7px, var(--color-paper) 7px 14px)",
          }}
        />

        <div className="px-5 sm:px-7 pt-6 pb-2 flex flex-col items-center text-center gap-3">
          <Seal state={failed ? "failed" : verified ? "verified" : "checking"} />
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[26px] sm:text-[28px] leading-[1.12] tracking-[-0.015em]">
              {failed ? "Couldn’t verify this ballot" : verified ? "Ballot verified" : "Checking ballot…"}
            </h2>
            <p className="text-[14px] text-text-secondary leading-relaxed text-balance">
              {failed
                ? "Something here doesn’t match the ledger. See the proof below."
                : verified
                  ? `${votes.length} ${noun} for ${year}, unchanged since ${sealedOn(blocks)}.`
                  : "Your browser is recomputing the proof."}
            </p>
          </div>
          <div className="flex items-center gap-1.5 max-w-full bg-paper border border-border rounded-sm pl-3 pr-1.5 py-1">
            <span className="min-w-0 font-mono text-[11px] min-[360px]:text-[12px] sm:text-[13px] text-text-secondary whitespace-nowrap select-all">
              {ballotId}
            </span>
            <CopyBallotId id={ballotId} />
          </div>
        </div>

        <ol className="px-5 sm:px-7 pb-3 mt-3">
          {votes.map((vote, i) => (
            <li key={vote.askId} className="border-t border-border">
              {/* A new tab, so the proof stays on screen: the ID is never in
                  this page's URL, so coming back would mean entering it again. */}
              {vote.askText ? (
                <a
                  href={`/share/${vote.askId}`}
                  target="_blank"
                  rel="noopener"
                  aria-label={`Open ask in a new tab: ${vote.askText}`}
                  className="group flex items-center gap-3 py-4 outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-sm"
                >
                  <VoteRow vote={vote} position={i + 1} />
                  <ChevronIcon />
                </a>
              ) : (
                <div className="flex items-center gap-3 py-4">
                  <VoteRow vote={vote} position={i + 1} />
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-card border border-border rounded-card px-5 sm:px-7 py-4 flex flex-col gap-3">
        <h3 className="font-sans text-xs uppercase tracking-[0.16em] text-text-muted">The proof</h3>

        <ul className="flex flex-col gap-3">
          {checks
            ? checks.map((check) => (
                <li key={check.title} className="flex items-start gap-2.5">
                  <CheckMark ok={check.ok} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-text leading-snug">{check.title}</p>
                    {check.detail && (
                      <p className="text-[13px] text-text-secondary leading-snug mt-0.5">
                        {check.detail}
                      </p>
                    )}
                  </div>
                </li>
              ))
            : PENDING.map((title) => (
                <li key={title} className="flex items-center gap-2.5">
                  <span className="w-5 h-5 shrink-0 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-muted animate-pulse motion-reduce:animate-none" />
                  </span>
                  <p className="text-[14px] text-text-muted">{title}</p>
                </li>
              ))}
        </ul>

        <details className="group/details border-t border-border pt-3">
          <summary className="flex items-center justify-between gap-2 text-[13px] text-text-secondary cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            Technical details
            <span className="group-open/details:rotate-90 transition-transform">
              <ChevronIcon />
            </span>
          </summary>
          <dl className="mt-3 flex flex-col gap-3">
            {blocks.map((block) => (
              <div key={block.height} className="flex flex-col gap-2">
                <Detail label="Block" value={`#${block.height}, sealed ${sealedOn([block])}`} />
                <Detail label="Block hash" value={block.hash} mono />
                <Detail label="Previous hash" value={block.prevHash} mono />
              </div>
            ))}
          </dl>
        </details>
      </section>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 [&_button[type=submit]]:w-full sm:[&_button[type=submit]]:w-auto">
        <SaveBallotId id={ballotId} year={year} from="verify" />
        <button
          type="button"
          onClick={onReset}
          className="text-[13px] text-accent cursor-pointer hover:underline underline-offset-4 mx-auto sm:mx-0 sm:ml-auto"
        >
          Check another ID
        </button>
      </div>
    </div>
  );
}

function VoteRow({ vote, position }: { vote: BallotVote; position: number }) {
  return (
    <>
      <span className="font-display font-black text-lg leading-snug text-text-muted w-5 shrink-0 text-center self-start">
        {position}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-text leading-snug group-hover:underline underline-offset-4">
          {vote.askText ?? "An ask that isn't public right now"}
        </p>
        {vote.timeframe && (
          <p className="text-[13px] text-text-muted mt-1 tabular-nums">Deadline {vote.timeframe}</p>
        )}
      </div>
    </>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-text-muted">{label}</dt>
      <dd className={cn("text-[13px] text-text-secondary", mono && "font-mono text-[12px] break-all")}>
        {value}
      </dd>
    </div>
  );
}

function Seal({ state }: { state: "checking" | "verified" | "failed" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex items-center justify-center w-12 h-12 rounded-full",
        state === "verified" && "bg-support-bg text-support-fg",
        state === "failed" && "bg-against-bg text-against-fg",
        state === "checking" && "bg-noresponse-bg text-text-muted",
      )}
    >
      {state === "checking" ? (
        <span className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none" />
      ) : (
        <svg viewBox="0 0 20 20" fill="none" className="w-6 h-6">
          <path
            d={state === "verified" ? "M4 10.5l4 4 8-9" : "M5.5 5.5l9 9M14.5 5.5l-9 9"}
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

function CheckMark({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "flex items-center justify-center w-5 h-5 shrink-0 rounded-full",
        ok ? "bg-support-bg text-support-fg" : "bg-against-bg text-against-fg",
      )}
    >
      <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5" role="img" aria-label={ok ? "Passed" : "Failed"}>
        <path
          d={ok ? "M4 10.5l4 4 8-9" : "M5.5 5.5l9 9M14.5 5.5l-9 9"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className="w-4 h-4 shrink-0 text-text-muted group-hover:text-accent transition-colors"
    >
      <path
        d="M7.5 4.5L13 10l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
