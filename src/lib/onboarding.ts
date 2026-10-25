import type { LocationValue } from "@/components/onboarding/LocationField";

/*
  Local record that this browser has answered onboarding. It exists so the
  first vote can send a new person through /onboarding exactly once. Like the
  vote record it is only a cache: persisting the answers to the database
  (tech-debt: "Onboarding doesn't gate the first vote yet") is still open.
*/

const ONBOARDING_KEY = "citizen:onboarding";

export interface OnboardingAnswers {
  age: number;
  location: LocationValue;
  gender: string;
  education?: string;
  occupation?: string;
}

export function isOnboarded(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) !== null;
  } catch {
    // Storage unavailable — don't trap the person in a loop; let them vote.
    return true;
  }
}

export function saveOnboarding(answers: OnboardingAnswers) {
  try {
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(answers));
  } catch {
    // Storage unavailable — they'd just be asked again next time.
  }
}

/** Where to go after onboarding. Same-site paths only, so `?next=` can't bounce people off-site. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/search";
}
