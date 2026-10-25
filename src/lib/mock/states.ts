// Placeholder state-level vote breakdown until real votes carry a city/state
// (captured at onboarding — see migration 0002) in enough volume to make a
// real query meaningful. Figures are illustrative, not derived from data.
export interface StateVoteShare {
  state: string;
  votes: number;
}

export const STATE_VOTE_SHARE: StateVoteShare[] = [
  { state: "Maharashtra", votes: 8214 },
  { state: "Karnataka", votes: 6842 },
  { state: "Delhi", votes: 5390 },
  { state: "Tamil Nadu", votes: 4718 },
  { state: "Uttar Pradesh", votes: 4103 },
  { state: "West Bengal", votes: 3287 },
  { state: "Telangana", votes: 2954 },
  { state: "Gujarat", votes: 2601 },
];
