import type { Ask } from "@/components/AskCard";

/*
  Placeholder data until Supabase is wired up.

  Deliberately fake party names (Party A/B/C/D). Real party names must not
  appear next to positions we haven't sourced — a wrong attribution here is
  the one failure mode that could do actual harm, and it's also the fastest
  way to lose the credibility the product depends on. Real names go in only
  once party_responses rows carry a source_url.

  The figures are plausible but unverified, which is why every seeded ask
  carries verificationStatus 'unverified'. That's the honest default, not a
  placeholder to be flipped before launch.
*/

export const TOTAL_VOTES_CAST = 48102;

export const SEED_ASKS: Ask[] = [
  {
    id: "edu-gdp",
    askText: "Raise public education spending from 2.9% to 6% of GDP",
    currentValue: "2.9% of GDP",
    targetValue: "6% of GDP",
    timeframe: "2029",
    targetBody: "Ministry of Education, Union Government",
    mechanism:
      "Phased increase in the Union education budget across five annual cycles, with state-matching grants tied to enrolment and retention benchmarks.",
    verificationStatus: "unverified",
    voteCount: 12408,
    partyResponses: [
      { party: "Party A", status: "support" },
      { party: "Party B", status: "no_response" },
      { party: "Party C", status: "against" },
    ],
  },
  {
    id: "police-resolution",
    askText: "Publish police complaint resolution times monthly",
    currentValue: "Not published",
    targetValue: "Monthly public dashboard, district-level",
    timeframe: "2027",
    targetBody: "State Home Departments",
    mechanism:
      "Mandatory monthly disclosure of complaint intake, resolution and pendency counts per district, published in machine-readable format.",
    verificationStatus: "unverified",
    voteCount: 8931,
    partyResponses: [
      { party: "Party A", status: "support" },
      { party: "Party D", status: "defected" },
    ],
  },
  {
    id: "health-spend",
    askText: "Raise public health spending from 1.9% to 3% of GDP",
    currentValue: "1.9% of GDP",
    targetValue: "3% of GDP",
    timeframe: "2030",
    targetBody: "Ministry of Health and Family Welfare",
    mechanism:
      "Annual increments in the Union health outlay, with a fixed share ring-fenced for primary health centres in districts below the national bed-per-capita median.",
    verificationStatus: "unverified",
    voteCount: 7644,
    partyResponses: [
      { party: "Party B", status: "support" },
      { party: "Party C", status: "no_response" },
    ],
  },
  {
    id: "mp-attendance",
    askText: "Publish MP attendance and voting records within 48 hours",
    currentValue: "Delayed, inconsistent format",
    targetValue: "Within 48 hours, machine-readable",
    timeframe: "2027",
    targetBody: "Lok Sabha Secretariat",
    mechanism:
      "Structured publication of division-level voting records and attendance to a public API within two working days of each sitting.",
    verificationStatus: "unverified",
    voteCount: 6120,
    partyResponses: [{ party: "Party A", status: "no_response" }],
  },
  {
    id: "air-quality",
    askText: "Bring PM2.5 in the 20 worst cities under 40 µg/m³ annual mean",
    currentValue: "Above 100 µg/m³ in several cities",
    targetValue: "Under 40 µg/m³ annual mean",
    timeframe: "2032",
    targetBody: "Central Pollution Control Board, State Boards",
    mechanism:
      "City-level airshed plans with binding annual reduction targets and quarterly public reporting against baseline.",
    verificationStatus: "unverified",
    voteCount: 5487,
    partyResponses: [
      { party: "Party C", status: "support" },
      { party: "Party D", status: "no_response" },
    ],
  },
];
