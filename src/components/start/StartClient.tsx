"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TopicPicker } from "@/components/topics/TopicPicker";
import { getInterests, saveInterests } from "@/lib/interests";

/**
 * The first screen after onboarding: topic pills only. There's no search box
 * here on purpose: a blank box this early confused people about what to type;
 * searching lives on /search. Next carries the first topic as ?topic= so the
 * list opens on that tab. Skip goes straight to Popular, as before.
 */
export function StartClient({ topics }: { topics: string[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);

  // Asked once per browser. replace, not push, throughout: Back from the
  // list shouldn't land here and bounce straight forward again.
  useEffect(() => {
    if (getInterests() !== null) router.replace("/search");
  }, [router]);

  const ready = picked.length > 0;

  function next() {
    if (!ready) return;
    saveInterests(picked);
    const params = new URLSearchParams();
    params.set("topic", picked[0]);
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
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[26px] sm:text-[30px] font-black text-headline tracking-[-0.02em] leading-tight">
          What matters to you?
        </h1>
        <p className="text-[14px] leading-relaxed text-text-secondary">
          Pick the topics you care about. Choose as many as you like.
        </p>
      </div>

      <TopicPicker topics={topics} selected={picked} onChange={setPicked} />

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
    </form>
  );
}
