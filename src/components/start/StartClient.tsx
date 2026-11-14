"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TopicPicker } from "@/components/topics/TopicPicker";
import { SearchPlaceholder } from "@/components/search/SearchPlaceholder";
import { VoiceButton } from "@/components/search/VoiceButton";
import { VoiceMode } from "@/components/search/VoiceMode";
import { useVoiceInput } from "@/components/search/useVoiceInput";
import { revealOnFocus } from "@/components/mobile/useMediaQuery";
import { getInterests, saveInterests } from "@/lib/interests";
import { cn } from "@/lib/cn";

/**
 * The first screen after onboarding: a big search box and topic pills.
 * Next carries both to /search (query as ?q=, first topic as ?topic= so the
 * list opens on that tab). Skip goes straight to Popular, as before.
 */
export function StartClient({ topics }: { topics: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  // Same voice screen as /search. What's heard fills the box and the screen
  // closes, so they can check it and pick topics before Next.
  const [voiceOpen, setVoiceOpen] = useState(false);
  const voice = useVoiceInput((text) => {
    setQuery(text.slice(0, 200));
    setVoiceOpen(false);
  });

  // Asked once per browser. replace, not push, throughout: Back from the
  // list shouldn't land here and bounce straight forward again.
  useEffect(() => {
    if (getInterests() !== null) router.replace("/search");
  }, [router]);

  const q = query.trim();
  const ready = q.length > 0 || picked.length > 0;

  function next() {
    if (!ready) return;
    saveInterests(picked);
    const params = new URLSearchParams();
    if (picked[0]) params.set("topic", picked[0]);
    if (q) params.set("q", q.slice(0, 200));
    router.replace(`/search?${params}`);
  }

  function skip() {
    saveInterests([]);
    router.replace("/search");
  }

  return (
    <form
      className="flex-1 flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[26px] sm:text-[30px] font-black text-headline tracking-[-0.02em] leading-tight">
            What matters to you?
          </h1>
          <p className="text-[14px] leading-relaxed text-text-secondary">
            Start from your own priorities, not what&rsquo;s already popular.
          </p>
        </div>

        {/* The examples and the hint live inside the box while it's empty,
            instead of a paragraph under it, so the topics stay on screen. */}
        <label className="flex flex-col">
          <span className="sr-only">
            Search a topic, a problem, or your own ask. If nobody has asked it yet, we&rsquo;ll
            help you add it.
          </span>
          <span className="relative block">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value.replace(/\s*\n\s*/g, " "))}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              next();
            }}
            onFocus={revealOnFocus("start")}
            enterKeyHint="go"
            autoComplete="off"
            maxLength={200}
            className={cn(
              "scroll-mt-16 block w-full min-h-[6.5rem] resize-none bg-card text-text",
              "border border-border rounded-card pl-4 pt-3 pb-8 text-[15px] leading-6",
              voice.supported ? "pr-12" : "pr-4",
              "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
            )}
          />
          {!query && (
            <span aria-hidden className="absolute inset-x-4 top-[13px] bottom-3 flex flex-col justify-between pointer-events-none pr-8">
              <SearchPlaceholder />
              <span className="text-[12px] leading-snug text-text-muted">
                A topic, a problem, or your whole ask. New ones we&rsquo;ll help you add.
              </span>
            </span>
          )}
          {voice.supported && (
            <VoiceButton
              onClick={() => {
                setVoiceOpen(true);
                voice.start();
              }}
              className="absolute right-0 top-0 h-[50px] w-11"
            />
          )}
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[13px] uppercase tracking-[0.08em] text-text-muted">
            Topics you care about
          </h2>
          <p className="text-[13px] text-text-secondary">
            Pick as many as you like.
          </p>
        </div>
        <TopicPicker topics={topics} selected={picked} onChange={setPicked} />
      </div>

      {/* Pinned under the thumb on phones; out of the way of the keyboard. */}
      <div className="hide-on-keyboard sticky bottom-0 mt-auto -mx-4 px-4 sm:-mx-6 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-paper border-t border-border flex items-center gap-3">
        <Button type="button" variant="ghost" className="min-h-11 px-5" onClick={skip}>
          Skip
        </Button>
        <Button type="submit" variant="primary" size="lg" className="flex-1 min-h-11" disabled={!ready}>
          {picked.length > 0
            ? `Next · ${picked.length} topic${picked.length === 1 ? "" : "s"}`
            : "Next"}
        </Button>
      </div>
      {voiceOpen && (
        <VoiceMode
          transcript={voice.transcript}
          searching={false}
          error={voice.error}
          onSend={voice.stop}
          onRetry={voice.start}
          onClose={() => {
            voice.cancel();
            setVoiceOpen(false);
          }}
        />
      )}
    </form>
  );
}
