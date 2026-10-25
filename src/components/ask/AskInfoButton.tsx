"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { useShowTopic } from "@/components/ask/ShowTopicContext";
import { isPlaceName } from "@/lib/places";
import { revealOnFocus } from "@/components/mobile/useMediaQuery";
import { getSessionId } from "@/lib/vote-session";
import type { Ask, AskBrief } from "@/lib/types";

const MIN_THOUGHT = 20;
const MAX_THOUGHT = 1000;

const InfoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="none" className={className}>
    <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 9v4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="10" cy="6.4" r="0.95" fill="currentColor" />
  </svg>
);

/**
 * "i" trigger beside the accountability icon. Click opens the ask's full
 * Info section: overview, a plea written as a letter, the reasoning, the
 * downsides, and a form for citizens to add thoughts.
 *
 * The brief is drafted by an LLM on first open and cached server-side
 * (/api/brief), so it is fetched only when someone actually asks for it —
 * never as part of the list payload.
 */
export function AskInfoButton({ ask }: { ask: Ask }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Full info about: ${ask.askText}`}
        aria-haspopup="dialog"
        className={cn(
          "relative flex items-center justify-center w-5 h-5 rounded-full cursor-pointer",
          "border border-border text-text-muted transition-colors",
          "hover:border-accent hover:text-accent active:border-accent active:text-accent",
          // Finger-sized hit area without changing how the icon looks.
          "after:absolute after:-inset-[7px]",
        )}
      >
        <InfoIcon className="w-3 h-3" />
      </button>
      {open && <AskInfoDialog ask={ask} onClose={() => setOpen(false)} />}
    </>
  );
}

type Load =
  | { state: "loading" }
  | { state: "ready"; brief: AskBrief }
  | { state: "error"; message: string };

function AskInfoDialog({ ask, onClose }: { ask: Ask; onClose: () => void }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/brief?id=${encodeURIComponent(ask.id)}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.brief) {
          throw new Error(
            res.status === 404
              ? "Detailed info isn't available for this ask yet."
              : "We couldn't draft the info for this ask just now.",
          );
        }
        setLoad({ state: "ready", brief: data.brief });
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setLoad({ state: "error", message: err.message });
      });
    return () => controller.abort();
  }, [ask.id, attempt]);

  // A long read: a tall sheet on phones (header pinned, body scrolls), a
  // wide dialog on desktop. Sheet portals to <body>, clear of the list rows
  // whose ancestors could clip a fixed overlay.
  return (
    <Sheet
      eyebrow="About this ask"
      title={<span className="text-xl">{ask.askText}</span>}
      description={
        <>
          {ask.currentValue && ask.targetValue && (
            <p className="tabular-nums">
              <span className="text-text-muted">{ask.currentValue}</span>
              <span className="text-text-muted" aria-hidden> → </span>
              <span className="font-semibold text-text">{ask.targetValue}</span>
              {ask.timeframe && (
                <span className="text-text-secondary"> · by {ask.timeframe}</span>
              )}
            </p>
          )}
          <TopicChips ask={ask} onLeave={onClose} />
        </>
      }
      size="full"
      width="xl"
      onClose={onClose}
      bodyClassName="pt-2"
    >
      <div className="flex flex-col gap-6">
        {load.state === "loading" && <BriefSkeleton />}

        {load.state === "error" && (
          <div className="flex flex-col items-start gap-3 rounded-sm border border-border bg-paper px-4 py-4">
            <p className="text-sm text-text-secondary">{load.message}</p>
            {!load.message.includes("isn't available") && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setLoad({ state: "loading" });
                  setAttempt((n) => n + 1);
                }}
              >
                Try again
              </Button>
            )}
          </div>
        )}

        {load.state === "ready" && <BriefBody brief={load.brief} />}

        {load.state === "ready" && <ThoughtForm askId={ask.id} />}
      </div>
    </Sheet>
  );
}

/**
 * The ask's topics. Cards leave tags out (on a phone they cost a line), so
 * this is where they live. On the search screen each chip is a shortcut:
 * close the sheet and show every ask on that topic. Place tags are left out,
 * as in Filters → Topics — the Cities filter covers those.
 */
function TopicChips({ ask, onLeave }: { ask: Ask; onLeave: () => void }) {
  const showTopic = useShowTopic();
  const topics = (ask.tags ?? []).filter((tag) => !isPlaceName(tag));
  if (topics.length === 0) return null;

  const chip = "text-[13px] px-2.5 py-1 rounded-sm border border-border bg-paper text-text-secondary";
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {topics.map((topic) =>
        showTopic ? (
          <button
            key={topic}
            type="button"
            onClick={() => {
              onLeave();
              showTopic(topic);
            }}
            aria-label={`Show all asks on ${topic}`}
            className={cn(
              chip,
              "inline-flex items-center gap-1 cursor-pointer transition-colors",
              "hover:border-accent hover:text-accent active:border-accent active:text-accent",
            )}
          >
            {topic}
            <span aria-hidden className="text-text-muted">›</span>
          </button>
        ) : (
          <span key={topic} className={chip}>
            {topic}
          </span>
        ),
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-sans text-[13px] font-semibold uppercase tracking-[0.08em] text-text-muted">
      {children}
    </h3>
  );
}

function BriefSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <p className="text-sm text-text-secondary">
        Reading up on this ask — the first time takes a few seconds…
      </p>
      {[92, 100, 85, 96, 60].map((w, i) => (
        <span
          key={i}
          className="h-3 animate-pulse rounded-sm bg-border/60"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  );
}

function BriefBody({ brief }: { brief: AskBrief }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <SectionHeading>Overview</SectionHeading>
        <p className="text-[15px] leading-relaxed text-text">{brief.overview}</p>
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeading>The plea</SectionHeading>
        <div className="flex flex-col gap-3 border-l-2 border-accent/40 pl-4 text-[15px] leading-relaxed text-text-secondary">
          {brief.plea.split(/\n{2,}/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeading>Why this matters</SectionHeading>
        <ul className="flex flex-col gap-2.5">
          {brief.reasoning.map((r, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-text">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2 rounded-sm border border-border bg-paper px-4 py-4">
        <SectionHeading>The other side — downsides to weigh</SectionHeading>
        {brief.downsides.length > 0 ? (
          <ul className="flex flex-col gap-2.5">
            {brief.downsides.map((d, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-text">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-text-muted" aria-hidden />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] leading-relaxed text-text">
            No substantial downsides were identified. That is not proof there are none — add one below if you see it.
          </p>
        )}
      </section>

      {brief.sources.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <SectionHeading>Sources</SectionHeading>
          <ul className="flex flex-col gap-1">
            {/* Index in the key: a brief can cite the same page twice. */}
            {brief.sources.map((s, i) => (
              <li key={`${i}:${s.url}`}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-text-secondary underline decoration-border underline-offset-4 hover:text-text hover:decoration-current transition-colors"
                >
                  {s.title} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs leading-relaxed text-text-muted">
        Drafted by AI from public sources and unverified, like every ask on this
        platform. Last updated{" "}
        {new Date(brief.updatedAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
        .
      </p>
    </div>
  );
}

function ThoughtForm({ askId }: { askId: string }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const length = text.trim().length;
  const tooShort = length < MIN_THOUGHT;

  async function submit() {
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/thoughts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: askId,
          body: text.trim(),
          sessionId: getSessionId(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not send your thought");
      }
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your thought");
      setStatus("idle");
    }
  }

  if (status === "done") {
    return (
      <section className="flex flex-col gap-1.5 rounded-sm border border-border bg-paper px-4 py-4">
        <h3 className="font-sans text-[15px] font-semibold tracking-normal text-text">
          Thank you for adding your thoughts
        </h3>
        <p className="text-sm leading-relaxed text-text-secondary">
          It won&apos;t appear straight away. We review every thought, and a
          nightly update adds it to this page only if it brings something new —
          so it may not be added, and that doesn&apos;t mean it wasn&apos;t heard.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2 border-t border-border pt-5">
      <SectionHeading>Add your thoughts</SectionHeading>
      <p className="text-sm text-text-secondary">
        A fact, an example, a missing downside, someone this affects. Thoughts
        are reviewed before anything is added.
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_THOUGHT))}
        placeholder="What should anyone reading this ask know?"
        rows={4}
        onFocus={revealOnFocus("center")}
        disabled={status === "sending"}
        aria-label="Your thoughts on this ask"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-text-muted tabular-nums">
          {length}/{MAX_THOUGHT}
          {length > 0 && tooShort && ` · at least ${MIN_THOUGHT} characters`}
        </span>
        <Button
          size="sm"
          onClick={submit}
          disabled={tooShort || status === "sending"}
        >
          {status === "sending" ? "Sending…" : "Send thought"}
        </Button>
      </div>
      {error && <p className="text-xs text-against">{error}</p>}
    </section>
  );
}
