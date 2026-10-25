/*
  Where an ask applies, derived from its text. Asks don't carry a state or
  city column yet, so the filter panel reads them out of askText +
  targetBody. Pure and deterministic — the same ask always lands in the
  same place, in demo mode and on live data alike.

  City aliases include the civic bodies that only exist in that city
  (BMTC, BWSSB…), because an ask aimed at "BWSSB" is a Bengaluru ask even
  when it never says so. Keep aliases unambiguous: a short acronym that
  could mean two places is worse than a miss.
*/

export const ALL_INDIA = "All-India";

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
  // Union territories with their own legislature/administration people ask about.
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry", "Chandigarh",
];

const CITIES: { city: string; state: string; aliases: string[] }[] = [
  { city: "Bengaluru", state: "Karnataka", aliases: ["Bengaluru", "Bangalore", "BMTC", "BWSSB", "BMRCL", "BBMP", "Greater Bengaluru Authority"] },
  { city: "Mumbai", state: "Maharashtra", aliases: ["Mumbai", "Bombay", "BMC", "BEST", "MMRDA"] },
  { city: "Pune", state: "Maharashtra", aliases: ["Pune", "PMC", "PMPML"] },
  { city: "Chennai", state: "Tamil Nadu", aliases: ["Chennai", "Madras", "CMWSSB", "Greater Chennai Corporation"] },
  { city: "Hyderabad", state: "Telangana", aliases: ["Hyderabad", "GHMC", "HMWSSB"] },
  { city: "Kolkata", state: "West Bengal", aliases: ["Kolkata", "Calcutta", "KMC"] },
  { city: "Ahmedabad", state: "Gujarat", aliases: ["Ahmedabad", "AMC"] },
  { city: "Jaipur", state: "Rajasthan", aliases: ["Jaipur"] },
  { city: "Lucknow", state: "Uttar Pradesh", aliases: ["Lucknow"] },
  { city: "Kochi", state: "Kerala", aliases: ["Kochi", "Cochin"] },
];

/** True for a state or city name — such tags belong under States/Cities, not Topics. */
export function isPlaceName(value: string): boolean {
  const v = value.toLowerCase();
  return (
    STATES.some((s) => s.toLowerCase() === v) ||
    CITIES.some((c) => c.aliases.some((a) => a.toLowerCase() === v))
  );
}

function mentions(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Acronyms match case-sensitively so "BEST" (Mumbai's buses) isn't
  // triggered by the word "best".
  const flags = term === term.toUpperCase() ? "" : "i";
  return new RegExp(`\\b${escaped}\\b`, flags).test(text);
}

/** States and cities an ask names. No match → the ask is all-India. */
export function placesFor(text: string): { states: string[]; cities: string[] } {
  const cities = CITIES.filter((c) => c.aliases.some((a) => mentions(text, a)));
  const states = new Set(STATES.filter((s) => mentions(text, s)));
  // A city ask is also an ask about its state.
  for (const c of cities) states.add(c.state);
  return {
    states: states.size > 0 ? Array.from(states) : [ALL_INDIA],
    cities: cities.map((c) => c.city),
  };
}
