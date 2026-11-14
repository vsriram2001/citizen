"use client";

import { TopicIcon } from "@/components/topics/TopicIcon";
import { cn } from "@/lib/cn";

/**
 * Pills to pick any number of topics, each with its icon. Used on /start
 * and in the "Add topic" sheet over the list. Order of `selected` is the
 * order they were tapped: the first one becomes the tab the list opens on.
 */
export function TopicPicker({
  topics,
  selected,
  onChange,
  className,
}: {
  topics: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  return (
    <div role="group" aria-label="Topics" className={cn("flex flex-wrap gap-2", className)}>
      {topics.map((topic) => {
        const on = selected.includes(topic);
        return (
          <button
            key={topic}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((t) => t !== topic) : [...selected, topic])}
            className={cn(
              "flex items-center gap-2 min-h-10 pl-3 pr-3.5 py-2 rounded-sm border text-[14px] transition-colors cursor-pointer",
              on
                ? "bg-accent text-paper border-accent hover:bg-ink hover:border-ink"
                : "bg-card text-text border-border hover:border-muted",
            )}
          >
            <TopicIcon topic={topic} className={on ? undefined : "text-text-secondary"} />
            {topic}
            {on && (
              <svg aria-hidden viewBox="0 0 12 12" className="size-3 -mr-0.5" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="m2.5 6.5 2.5 2.5 4.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
