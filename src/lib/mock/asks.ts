import type { Ask } from "@/lib/types";

/*
  Placeholder data until Supabase is wired up: 19 seed asks, 500 votes in
  total.

  Party positions are left empty for now. When they come back, real party
  names go in only once party_responses rows carry a source_url — a wrong
  attribution is the one failure mode that could do actual harm.

  The figures are plausible but unverified, which is why every seeded ask
  carries verificationStatus 'unverified'. That's the honest default, not a
  placeholder to be flipped before launch.

  responsiblePeople: 1-3 officeholders per ask, picked for who actually has
  the lever — city/state for local matters, a Union minister (and the PM)
  only for Union-level asks, and a single state's minister only when the
  ask itself names that state. Re-checked 2026-10-24 against news reports
  (not yet official notifications); officeholders reshuffle constantly
  (Karnataka's government changed 3 Jun 2026; Union Education has been on
  additional charge with Pralhad Joshi since 25 Jul 2026). Verify before
  launch: Joshi's status, Byrathi Suresh (Karnataka Transport), Maheshwar Rao
  (GBA), P. C. Jaffer (BMRCL), Gyanesh Kumar (CEC).
  Build a way to update these without a code deploy.
*/

export const TOTAL_VOTES_CAST = 500;

export const SEED_ASKS: Ask[] = [
  {
    id: "edu-budget",
    askText: "Double the public education budget",
    currentValue: "2.7% of GDP (FY26 est.)",
    targetValue: "5.4% of GDP",
    timeframe: "Mar 2029",
    targetBody: "Ministry of Education, Union Government",
    responsiblePeople: [
      { name: "Narendra Modi", designation: "Prime Minister of India", organization: "Government of India" },
      { name: "Pralhad Joshi", designation: "Union Minister (additional charge: Education)", organization: "Ministry of Education" },
      { name: "Nirmala Sitharaman", designation: "Union Minister of Finance", organization: "Ministry of Finance" },
    ],
    mechanism:
      "Phased increase over five budget cycles, with state matching grants tied to enrolment and learning outcomes.",
    tags: ["Education", "Budget"],
    verificationStatus: "unverified",
    voteCount: 44,
    partyResponses: [],
  },
  {
    id: "bengaluru-metro",
    askText: "Add 50 km to Bengaluru's metro network",
    currentValue: "~96 km",
    targetValue: "~146 km",
    timeframe: "Oct 2028",
    targetBody: "BMRCL, Karnataka Urban Development Department",
    responsiblePeople: [
      { name: "D. K. Shivakumar", designation: "Chief Minister of Karnataka (holds Bengaluru Development)", organization: "Government of Karnataka" },
      { name: "P. C. Jaffer", designation: "Managing Director, BMRCL", organization: "Bangalore Metro Rail Corporation Limited" },
      { name: "Manohar Lal", designation: "Union Minister of Housing and Urban Affairs", organization: "Ministry of Housing and Urban Affairs" },
    ],
    mechanism:
      "Fast-track pending corridors with a dedicated funding line and monthly public progress reports.",
    tags: ["Transport", "Bengaluru"],
    verificationStatus: "unverified",
    voteCount: 40,
    partyResponses: [],
  },
  {
    id: "govt-kids-govt-schools",
    askText: "Require government employees' children to study in government schools",
    currentValue: "No requirement",
    targetValue: "100% of children",
    timeframe: "Jun 2027",
    targetBody: "Department of Personnel and Training (Union); State governments for their own employees",
    responsiblePeople: [
      { name: "Dr. Jitendra Singh", designation: "Minister of State (Independent Charge) for Science and Technology; MoS, Personnel, Public Grievances and Pensions", organization: "Department of Personnel and Training" },
      { name: "Pralhad Joshi", designation: "Union Minister (additional charge: Education)", organization: "Ministry of Education" },
    ],
    mechanism:
      "A service-rule amendment requiring enrolment in a government school, with an exemption only where none exists nearby.",
    tags: ["Education", "Governance"],
    verificationStatus: "unverified",
    voteCount: 35,
    partyResponses: [],
  },
  {
    id: "health-spend",
    askText: "Raise public health spending",
    currentValue: "1.8% of GDP (FY26 est.)",
    targetValue: "3% of GDP",
    timeframe: "Apr 2030",
    targetBody: "Ministry of Health and Family Welfare",
    responsiblePeople: [
      { name: "Narendra Modi", designation: "Prime Minister of India", organization: "Government of India" },
      { name: "J. P. Nadda", designation: "Union Minister of Health and Family Welfare", organization: "Ministry of Health and Family Welfare" },
      { name: "Nirmala Sitharaman", designation: "Union Minister of Finance", organization: "Ministry of Finance" },
    ],
    mechanism:
      "Yearly budget increments, with funds earmarked for primary care and district hospitals.",
    tags: ["Health", "Budget"],
    verificationStatus: "unverified",
    voteCount: 34,
    partyResponses: [],
  },
  {
    id: "police-resolution",
    askText: "Publish Karnataka police complaint resolution times every month",
    currentValue: "Not published",
    targetValue: "District-level public dashboard",
    timeframe: "Jan 2027",
    targetBody: "Karnataka Home Department, Karnataka Police",
    responsiblePeople: [
      { name: "Priyank Kharge", designation: "Karnataka Home Minister", organization: "Government of Karnataka" },
    ],
    mechanism:
      "Mandatory monthly disclosure of complaints received, resolved and pending per district, in machine-readable format.",
    tags: ["Policing", "Transparency"],
    verificationStatus: "unverified",
    voteCount: 33,
    partyResponses: [],
  },
  {
    id: "abolish-income-tax",
    askText: "Abolish personal income tax; raise revenue through consumption taxes",
    currentValue: "Income tax in place",
    targetValue: "Nil",
    timeframe: "Apr 2029",
    targetBody: "Ministry of Finance, Union Government",
    responsiblePeople: [
      { name: "Narendra Modi", designation: "Prime Minister of India", organization: "Government of India" },
      { name: "Nirmala Sitharaman", designation: "Union Minister of Finance", organization: "Ministry of Finance" },
    ],
    mechanism:
      "Phase out income tax slabs over two budgets, with the revenue gap covered by consumption-tax reform.",
    tags: ["Economy", "Tax"],
    verificationStatus: "unverified",
    voteCount: 31,
    partyResponses: [],
  },
  {
    id: "pothole-sla",
    askText: "Repair reported potholes within 30 days",
    currentValue: "No fixed deadline",
    targetValue: "30-day repair guarantee",
    timeframe: "Jun 2027",
    targetBody: "Bengaluru's municipal body",
    responsiblePeople: [
      { name: "Maheshwar Rao", designation: "Chief Commissioner, Greater Bengaluru Authority", organization: "Greater Bengaluru Authority" },
      { name: "D. K. Shivakumar", designation: "Chief Minister of Karnataka (holds Bengaluru Development)", organization: "Government of Karnataka" },
    ],
    mechanism:
      "A public complaint tracker, automatic escalation after 30 days, and contractor penalties for repeat failures.",
    tags: ["Infrastructure", "Bengaluru"],
    verificationStatus: "unverified",
    voteCount: 28,
    partyResponses: [],
  },
  {
    id: "bus-fleet",
    askText: "Double Bengaluru's city bus fleet",
    currentValue: "~6,950 buses (incl. ~1,700 electric)",
    targetValue: "~13,900 buses",
    timeframe: "Dec 2028",
    targetBody: "BMTC",
    responsiblePeople: [
      { name: "Byrathi Suresh", designation: "Karnataka Transport Minister", organization: "Government of Karnataka" },
      { name: "Raghunandan Murthy", designation: "Managing Director, BMTC", organization: "Bengaluru Metropolitan Transport Corporation" },
    ],
    mechanism:
      "A phased procurement plan, prioritising electric buses and dedicated bus lanes.",
    tags: ["Transport", "Bengaluru"],
    verificationStatus: "unverified",
    voteCount: 28,
    partyResponses: [],
  },
  {
    id: "water-24x7",
    askText: "24×7 piped water in every Bengaluru ward",
    currentValue: "Intermittent supply in most wards",
    targetValue: "24×7 supply in every ward",
    timeframe: "Dec 2029",
    targetBody: "BWSSB",
    responsiblePeople: [
      { name: "Dr. Manjula N.", designation: "Chairperson, BWSSB", organization: "Bengaluru Water Supply and Sewerage Board" },
      { name: "D. K. Shivakumar", designation: "Chief Minister of Karnataka (holds Bengaluru Development)", organization: "Government of Karnataka" },
    ],
    mechanism:
      "Ward-by-ward rollout with fixed milestones, plus leakage reduction to stretch supply.",
    tags: ["Water", "Bengaluru"],
    verificationStatus: "unverified",
    voteCount: 26,
    partyResponses: [],
  },
  {
    id: "teacher-vacancies",
    askText: "Fill all vacant government teacher posts",
    currentValue: "~10 lakh vacant posts",
    targetValue: "0 vacancies",
    timeframe: "Mar 2028",
    targetBody: "Union and State Education Departments",
    responsiblePeople: [
      { name: "Pralhad Joshi", designation: "Union Minister (additional charge: Education)", organization: "Ministry of Education" },
    ],
    mechanism:
      "Annual recruitment calendars with fixed exam and result dates, and a public vacancy tracker.",
    tags: ["Education", "Jobs"],
    verificationStatus: "unverified",
    voteCount: 24,
    partyResponses: [],
  },
  {
    id: "fee-cap",
    askText: "Cap annual private school fee hikes in Karnataka",
    currentValue: "Uncapped",
    targetValue: "8% a year",
    timeframe: "Jun 2027",
    targetBody: "Karnataka School Education Department",
    responsiblePeople: [
      { name: "Madhu Bangarappa", designation: "Karnataka Minister of School Education and Literacy", organization: "Government of Karnataka" },
    ],
    mechanism:
      "A state fee-regulation authority that approves any increase above the cap.",
    tags: ["Education"],
    verificationStatus: "unverified",
    voteCount: 22,
    partyResponses: [],
  },
  {
    id: "msp-law",
    askText: "Legal guarantee of MSP for major crops",
    currentValue: "Policy only",
    targetValue: "Statutory right",
    timeframe: "Mar 2028",
    targetBody: "Ministry of Agriculture and Farmers' Welfare",
    responsiblePeople: [
      { name: "Narendra Modi", designation: "Prime Minister of India", organization: "Government of India" },
      { name: "Shivraj Singh Chouhan", designation: "Union Minister of Agriculture and Farmers' Welfare", organization: "Ministry of Agriculture and Farmers' Welfare" },
    ],
    mechanism:
      "A central law guaranteeing minimum support prices, with procurement obligations.",
    tags: ["Agriculture", "Economy"],
    verificationStatus: "unverified",
    voteCount: 21,
    partyResponses: [],
  },
  {
    id: "lake-sewage",
    askText: "Stop untreated sewage entering Bengaluru's lakes",
    currentValue: "Untreated inflow",
    targetValue: "100% treated",
    timeframe: "Dec 2028",
    targetBody: "BWSSB, Karnataka State Pollution Control Board",
    responsiblePeople: [
      { name: "Dr. Manjula N.", designation: "Chairperson, BWSSB", organization: "Bengaluru Water Supply and Sewerage Board" },
      { name: "Maheshwar Rao", designation: "Chief Commissioner, Greater Bengaluru Authority", organization: "Greater Bengaluru Authority" },
    ],
    mechanism:
      "Treatment plants at every major inflow point, with public water-quality readings for each lake.",
    tags: ["Environment", "Bengaluru"],
    verificationStatus: "unverified",
    voteCount: 21,
    partyResponses: [],
  },
  {
    id: "ayushman-cover",
    askText: "Raise Ayushman Bharat cover per family",
    currentValue: "₹5 lakh",
    targetValue: "₹10 lakh",
    timeframe: "Apr 2027",
    targetBody: "Ministry of Health and Family Welfare, National Health Authority",
    responsiblePeople: [
      { name: "Narendra Modi", designation: "Prime Minister of India", organization: "Government of India" },
      { name: "J. P. Nadda", designation: "Union Minister of Health and Family Welfare", organization: "Ministry of Health and Family Welfare" },
    ],
    mechanism:
      "A higher cover limit, with annual budget allocation to match.",
    tags: ["Health"],
    verificationStatus: "unverified",
    voteCount: 20,
    partyResponses: [],
  },
  {
    id: "court-backlog",
    askText: "Clear half the pending court-case backlog",
    currentValue: "~5.4 crore pending cases",
    targetValue: "~2.7 crore pending cases",
    timeframe: "Dec 2030",
    targetBody: "Ministry of Law and Justice, Supreme Court of India",
    responsiblePeople: [
      { name: "Arjun Ram Meghwal", designation: "Union Minister of Law and Justice", organization: "Ministry of Law and Justice" },
      { name: "Surya Kant", designation: "Chief Justice of India", organization: "Supreme Court of India" },
    ],
    mechanism:
      "More fast-track courts and judge appointments, with yearly clearance targets.",
    tags: ["Justice"],
    verificationStatus: "unverified",
    voteCount: 20,
    partyResponses: [],
  },
  {
    id: "exam-results",
    askText: "Announce government exam results within 6 months, with no paper leaks",
    currentValue: "Often delayed and leak-prone",
    targetValue: "Results within 6 months",
    timeframe: "Jan 2027",
    targetBody: "Ministry of Education (NTA), DoPT (UPSC, SSC)",
    responsiblePeople: [
      { name: "Pralhad Joshi", designation: "Union Minister (additional charge: Education)", organization: "Ministry of Education" },
      { name: "Dr. Jitendra Singh", designation: "Minister of State (Independent Charge) for Science and Technology; MoS, Personnel, Public Grievances and Pensions", organization: "Department of Personnel and Training" },
    ],
    mechanism:
      "Fixed exam calendars, tamper-proof paper handling and a public audit after each leak.",
    tags: ["Jobs", "Governance"],
    verificationStatus: "unverified",
    voteCount: 20,
    partyResponses: [],
  },
  {
    id: "asset-declarations",
    askText: "Annual searchable asset declarations for all MPs and MLAs",
    currentValue: "Scattered PDFs",
    targetValue: "One searchable portal",
    timeframe: "Jan 2027",
    targetBody: "Election Commission of India",
    responsiblePeople: [
      { name: "Gyanesh Kumar", designation: "Chief Election Commissioner of India", organization: "Election Commission of India" },
      { name: "Arjun Ram Meghwal", designation: "Union Minister of Law and Justice", organization: "Ministry of Law and Justice" },
    ],
    mechanism:
      "A single open-data portal updated every year, with penalties for late filing.",
    tags: ["Governance", "Transparency"],
    verificationStatus: "unverified",
    voteCount: 19,
    partyResponses: [],
  },
  {
    id: "privatise-municipal",
    askText: "Privatise Bengaluru's municipal corporation services",
    currentValue: "Fully public",
    targetValue: "Outsourced to private operators",
    timeframe: "Apr 2028",
    targetBody: "Bengaluru's municipal body, Karnataka Urban Development Department",
    responsiblePeople: [
      { name: "Maheshwar Rao", designation: "Chief Commissioner, Greater Bengaluru Authority", organization: "Greater Bengaluru Authority" },
      { name: "D. K. Shivakumar", designation: "Chief Minister of Karnataka (holds Bengaluru Development)", organization: "Government of Karnataka" },
    ],
    mechanism:
      "Competitive tenders for service delivery under performance contracts, with public audits.",
    tags: ["Governance", "Bengaluru"],
    verificationStatus: "unverified",
    voteCount: 17,
    partyResponses: [],
  },
  {
    id: "cashless-accident-care",
    askText: "Cashless emergency treatment for road accident victims",
    currentValue: "Limited",
    targetValue: "Every hospital",
    timeframe: "Mar 2027",
    targetBody: "Ministry of Road Transport and Highways",
    responsiblePeople: [
      { name: "Nitin Gadkari", designation: "Union Minister of Road Transport and Highways", organization: "Ministry of Road Transport and Highways" },
      { name: "J. P. Nadda", designation: "Union Minister of Health and Family Welfare", organization: "Ministry of Health and Family Welfare" },
    ],
    mechanism:
      "A national scheme that reimburses hospitals directly, so treatment never waits on payment.",
    tags: ["Health", "Safety"],
    verificationStatus: "unverified",
    voteCount: 17,
    partyResponses: [],
  },
];
