"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TopicIcon } from "@/components/topics/TopicIcon";
import { TopicPicker } from "@/components/topics/TopicPicker";
import { cn } from "@/lib/cn";

/** The tab that isn't a topic: every ask, most votes first. */
export const POPULAR_TAB = "";

/**
 * One row of tabs that scrolls sideways: Popular, then the person's own
 * topics in the order they picked them, then "Add topic". A topic tab is
 * that topic's asks, still most votes first. `active` is null when the list
 * is narrowed some other way (several topics ticked in the filter panel),
 * so no tab claims it.
 */
export function TopicTabs({
  tabs,
  active,
  onSelect,
  choices,
  onTabsChange,
}: {
  tabs: string[];
  active: string | null;
  onSelect: (topic: string) => void;
  /** Every topic there is, for the Add topic sheet. */
  choices: string[];
  onTabsChange: (tabs: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  // Opening on the first topic, or switching from the info sheet, can pick a
  // tab that's off-screen: bring it into view.
  // Sideways only: scrollIntoView would also scroll the page, since the row
  // sits in a sticky header.
  useEffect(() => {
    const row = rowRef.current;
    const el = row?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!row || !el) return;
    const left = el.offsetLeft - row.offsetLeft;
    if (left < row.scrollLeft || left + el.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollTo({ left: Math.max(0, left - 16), behavior: "smooth" });
    }
  }, [active]);

  const tab = (topic: string, label: React.ReactNode) => {
    const on = active === topic;
    return (
      <button
        key={topic || "popular"}
        type="button"
        role="tab"
        aria-selected={on}
        onClick={() => onSelect(topic)}
        className={cn(
          "relative flex items-center gap-1.5 shrink-0 min-h-10 px-3 text-[14px] whitespace-nowrap cursor-pointer transition-colors",
          // Underline like a tab bar, so it reads apart from the filter chips.
          "after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:rounded-sm",
          on
            ? "text-headline font-semibold after:bg-accent"
            : "text-text-secondary hover:text-text after:bg-transparent",
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <>
      <div className="relative -mx-4 sm:-mx-6 lg:mx-0 border-b border-border">
        <div
          ref={rowRef}
          role="tablist"
          aria-label="Topics"
          className="flex items-stretch overflow-x-auto no-scrollbar px-2 sm:px-4 lg:px-0 lg:-ml-3"
        >
          {tab(POPULAR_TAB, "Popular")}
          {tabs.map((topic) =>
            tab(
              topic,
              <>
                <TopicIcon topic={topic} />
                {topic}
              </>,
            ),
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 shrink-0 min-h-10 px-3 text-[14px] text-accent whitespace-nowrap cursor-pointer hover:underline underline-offset-4"
          >
            <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M6 2v8M2 6h8" strokeLinecap="round" />
            </svg>
            Add topic
          </button>
        </div>
      </div>

      {editing && (
        <EditTopicsSheet
          choices={choices}
          tabs={tabs}
          onClose={() => setEditing(false)}
          onSave={(next) => {
            onTabsChange(next);
            setEditing(false);
          }}
        />
      )}
    </>
  );
}

function EditTopicsSheet({
  choices,
  tabs,
  onClose,
  onSave,
}: {
  choices: string[];
  tabs: string[];
  onClose: () => void;
  onSave: (tabs: string[]) => void;
}) {
  const [picked, setPicked] = useState(tabs);
  // Their tabs first (they may be rarer topics), then the rest.
  const topics = [...tabs, ...choices.filter((t) => !tabs.includes(t))];
  return (
    <Sheet
      title="Your topics"
      description="Each one becomes a tab over the list. Tap to add or remove."
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="flex-1 min-h-11" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="flex-[2] min-h-11" onClick={() => onSave(picked)}>
            Save
          </Button>
        </div>
      }
    >
      <TopicPicker topics={topics} selected={picked} onChange={setPicked} />
    </Sheet>
  );
}
