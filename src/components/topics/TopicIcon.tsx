import { cn } from "@/lib/cn";
import { isTopic, type Topic } from "@/lib/topics";

/*
  A small line icon for a topic, so a row of pills can be scanned by shape
  before it's read. Tags are free text (whoever adds an ask, or the model,
  names them), so icons are matched by keyword, not exact name: "Maternal
  Health" and "Public Health" both get the heart. Unknown topics get a tag.
  Stroke-only in currentColor, so they take the pill's own text colour and
  never bring a colour of their own.
*/

type IconKey =
  | "eye" | "heart" | "leaf" | "pillar" | "bus" | "rupee" | "drop" | "crane"
  | "house" | "road" | "scales" | "shield" | "bolt" | "briefcase" | "sprout"
  | "person" | "book" | "wind" | "cart" | "pill" | "bin" | "ball" | "device" | "tag";

// First match wins, so the more specific words come first.
const RULES: [RegExp, IconKey][] = [
  [/road/i, "road"],
  [/consumer/i, "cart"],
  [/drug|pill|medicine/i, "pill"],
  [/food|agri|farm|crop|nutrition/i, "sprout"],
  [/health|hospital|diabet|doctor|disease/i, "heart"],
  [/transparen|data|rti|corruption/i, "eye"],
  [/environment|climate|forest|green|tree/i, "leaf"],
  [/air|pollution|noise/i, "wind"],
  [/water|sanitation|sewage|lake|river/i, "drop"],
  [/waste|garbage/i, "bin"],
  [/transport|metro|bus|traffic|mobility/i, "bus"],
  [/infra|construction|bridge/i, "crane"],
  // Before "city" below, which "Electricity" contains.
  [/electric|power|energy/i, "bolt"],
  [/hous|land|urban|city|public space/i, "house"],
  [/safety|polic|crime|security/i, "shield"],
  [/justice|law|right|court|reservation|constitution/i, "scales"],
  [/tax|econom|budget|inflation|wage|pric|finance/i, "rupee"],
  [/job|employ|labour|labor|work/i, "briefcase"],
  [/educat|school|college|exam|university/i, "book"],
  [/women|gender|child|maternal/i, "person"],
  [/sport/i, "ball"],
  [/govern|regulat|civil service|public.?service|parliament/i, "pillar"],
];

// The fixed topics (lib/topics.ts) by name; the keyword rules below cover
// anything else (an old saved pick, a raw tag on the design page).
const BY_TOPIC: Record<Topic, IconKey> = {
  "Prices & Money": "rupee",
  "Jobs & Business": "briefcase",
  Health: "heart",
  Education: "book",
  "Farming & Food": "sprout",
  "Transport & Roads": "bus",
  "Water, Power & Waste": "drop",
  "Environment & Climate": "leaf",
  "Cities & Housing": "house",
  "Safety & Justice": "scales",
  "Rights & Welfare": "person",
  "Governance & Transparency": "pillar",
  "Digital & Tech": "device",
};

function iconFor(topic: string): IconKey {
  if (isTopic(topic)) return BY_TOPIC[topic];
  return RULES.find(([re]) => re.test(topic))?.[1] ?? "tag";
}

const PATHS: Record<IconKey, React.ReactNode> = {
  eye: (
    <>
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </>
  ),
  heart: (
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z M7.5 12h2.2l1.3-2.2 2 4 1.3-1.8h2.2" />
  ),
  leaf: <path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14Zm0 0 7-7" />,
  pillar: <path d="M3.5 9.5 12 4.5l8.5 5M5 9.5h14M6.5 10v7M10 10v7M14 10v7M17.5 10v7M4 19.5h16" />,
  bus: (
    <>
      <rect x="5" y="3.5" width="14" height="14" rx="2" />
      <path d="M5 11h14M8 17.5V20M16 17.5V20M8.5 14.5h.01M15.5 14.5h.01" />
    </>
  ),
  rupee: <path d="M7 5h10M7 9h10M10 5c5 0 5 8 0 8H7l7 6" />,
  drop: <path d="M12 3.5s6 6.6 6 10.5a6 6 0 0 1-12 0c0-3.9 6-10.5 6-10.5Z" />,
  crane: <path d="M6 20.5V4.5M6 4.5h13M6 8l4-3.5M17 4.5v4M15.5 8.5h3v3h-3zM3.5 20.5h6" />,
  house: <path d="M4 11 12 4.5l8 6.5M6 9.5v10h12v-10M10 19.5v-5h4v5" />,
  road: <path d="M8.5 3.5 5 20.5M15.5 3.5l3.5 17M12 4.5v2.5M12 10.5v3M12 17v3" />,
  scales: <path d="M12 4v16M7.5 20h9M5 7h14M5 7l-2.5 6a2.5 2.5 0 0 0 5 0L5 7Zm14 0-2.5 6a2.5 2.5 0 0 0 5 0L19 7Z" />,
  shield: <path d="M12 3.5 19 6v5.5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-2.5Z" />,
  bolt: <path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12L13 3Z" />,
  briefcase: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="1.5" />
      <path d="M9 7.5V5.5h6v2M3.5 12.5h17" />
    </>
  ),
  sprout: <path d="M12 20.5V11M12 11c0-3.5-2.5-6-6.5-6 0 3.5 2.5 6 6.5 6Zm0 0c0-3 2-5.5 6.5-5.5 0 3.5-2.5 5.5-6.5 5.5ZM7 20.5h10" />,
  person: (
    <>
      <circle cx="12" cy="7" r="3" />
      <path d="M5.5 20.5c.5-4 3-6.5 6.5-6.5s6 2.5 6.5 6.5" />
    </>
  ),
  book: <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5M12 6.5c2-1.5 5-2 8-1.5v13c-3-.5-6 0-8 1.5M12 6.5v13" />,
  wind: <path d="M3.5 9h11a2.5 2.5 0 1 0-2.5-2.5M3.5 13h15a2.5 2.5 0 1 1-2.5 2.5M3.5 17h7" />,
  cart: (
    <>
      <path d="M3 4.5h2.5L8 15.5h10l2-8H6.5" />
      <circle cx="9" cy="19" r="1.25" />
      <circle cx="17" cy="19" r="1.25" />
    </>
  ),
  pill: (
    <>
      <rect x="3.6" y="8.4" width="16.8" height="7.2" rx="3.6" transform="rotate(-45 12 12)" />
      <path d="m9.5 9.5 5 5" />
    </>
  ),
  bin: <path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 14h9l1-14M10.5 10v7M13.5 10v7" />,
  ball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5c-3 3-3 14 0 17M12 3.5c3 3 3 14 0 17M3.5 12h17" />
    </>
  ),
  device: (
    <>
      <rect x="6.5" y="3" width="11" height="18" rx="2" />
      <path d="M10.5 17.5h3" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.5V4.5h8l9 9-8 8-9-9Z" />
      <circle cx="8" cy="9" r="1.25" />
    </>
  ),
};

export function TopicIcon({ topic, className }: { topic: string; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4 shrink-0", className)}
    >
      {PATHS[iconFor(topic)]}
    </svg>
  );
}
