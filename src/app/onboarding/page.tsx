"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { LocationField, type LocationValue } from "@/components/onboarding/LocationField";
import { OCCUPATIONS } from "@/lib/occupations";
import { cn } from "@/lib/cn";
import { SignInModal } from "@/components/auth/SignInModal";
import { useAuth } from "@/components/auth/useAuth";
import { isOnboarded, saveOnboarding, safeNext } from "@/lib/onboarding";
import { takeResume } from "@/lib/vote-session";

/*
  Onboarding — collected once per session, gates before first vote, never
  before browsing. Age, location, and gender are required (location and
  gender need an explicit answer, not necessarily a granular one — "prefer
  not to say" satisfies gender). Education and occupation stay optional but
  are nudged as recommended, since they meaningfully improve the demographic
  breakdowns without being essential to unlock voting.
*/

const EDUCATION_OPTIONS = [
  "Below High School",
  "High School",
  "Diploma / Vocational",
  "Graduation",
  "Post Graduation",
  "PhD",
  "Post-Doc",
] as const;

const GENDER_OPTIONS = ["Male", "Female"] as const;
const GENDER_MORE_OPTIONS = [
  "Non-binary",
  "Transgender",
  "Genderqueer",
  "Agender",
  "Prefer to self-describe",
  "Prefer not to say",
] as const;

export default function Onboarding() {
  const router = useRouter();
  const auth = useAuth();
  // After the details are saved we offer Google sign-in, which they can skip.
  const [signInOffered, setSignInOffered] = useState(false);
  const [headerSigningIn, setHeaderSigningIn] = useState(false);
  const [age, setAge] = useState("");
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [genderMoreOpen, setGenderMoreOpen] = useState(false);
  const [genderMoreSelection, setGenderMoreSelection] = useState("");
  const [genderCustomText, setGenderCustomText] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [education, setEducation] = useState("");
  const [occupation, setOccupation] = useState("");

  // Home sends everyone here; anyone who has already answered goes straight on.
  useEffect(() => {
    if (isOnboarded()) router.replace(safeNext(new URLSearchParams(window.location.search).get("next")));
  }, [router]);

  const ageNum = Number(age);
  const ageValid = age !== "" && ageNum >= 13 && ageNum <= 120;

  const genderComplete =
    gender !== null &&
    gender !== "Prefer to self-describe" ? true : genderCustomText.trim() !== "";

  const canSubmit = ageValid && location !== null && genderComplete;

  function handleGenderMoreSelect(value: string) {
    setGenderMoreSelection(value);
    setGender(value || null);
    if (value !== "Prefer to self-describe") {
      setGenderCustomText("");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const resolvedGender =
      gender === "Prefer to self-describe" ? genderCustomText.trim() : gender;
    // Remembered in this browser so the first vote only detours here once.
    // TODO: persist to the database (tech-debt: onboarding fields on the voter).
    saveOnboarding({
      age: ageNum,
      location,
      gender: resolvedGender ?? "",
      education: education || undefined,
      occupation: occupation || undefined,
    });
    setSignInOffered(true);
  }

  const next = () => safeNext(new URLSearchParams(window.location.search).get("next"));

  function skipSignIn() {
    // They chose to browse first, so don't re-prompt on search for a vote tap
    // that sent them here; the next tap asks for sign-in.
    takeResume();
    router.push(next());
  }

  const isGenderMoreOption = (g: string | null) =>
    g !== null && (GENDER_MORE_OPTIONS as readonly string[]).includes(g);

  return (
    // Desktop: fixed frame, the form scrolls inside it. Phones: the page
    // itself scrolls — iOS keeps a focused field in view reliably only for
    // page scroll, not for a scroll box inside a locked screen.
    <div className="min-h-dvh flex flex-col sm:h-dvh sm:overflow-hidden">
      <SiteHeader>
        {auth.ready && !auth.userId && (
          <button
            type="button"
            disabled={headerSigningIn}
            onClick={() => {
              // Same as the sign-in sheet: show progress until the page
              // leaves for Google, so one tap visibly did something.
              setHeaderSigningIn(true);
              auth.signInWithGoogle(next()).catch(() => setHeaderSigningIn(false));
            }}
            className="text-[13px] text-text-secondary hover:text-text transition-colors underline decoration-transparent hover:decoration-current underline-offset-4 cursor-pointer disabled:cursor-default disabled:no-underline max-sm:py-2.5"
          >
            {headerSigningIn ? (
              "Opening Google…"
            ) : (
              <>
                <span className="sm:hidden">Sign in</span>
                <span className="hidden sm:inline">Already signed up? Sign in</span>
              </>
            )}
          </button>
        )}
      </SiteHeader>

      {/* keyboard-room: extra space below while typing, so the last fields
          and their suggestion lists can scroll up clear of the keyboard. */}
      <main className="keyboard-room flex-1 sm:min-h-0 sm:overflow-y-auto px-5 sm:px-6 pt-6 sm:pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pb-28">
        <form
          id="onboarding-form"
          onSubmit={handleSubmit}
          className="w-full max-w-lg mx-auto flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">
              Before you vote · under 30 seconds
            </p>
            <h1 className="text-[28px] sm:text-[32px] leading-[1.05]">
              A few quick details
            </h1>
            <p className="text-[14px] text-text-secondary leading-relaxed sm:whitespace-nowrap">
              How support breaks down across the country.
            </p>
          </div>

          <Field label="Age" htmlFor="age" size="md-lg">
            <Input
              id="age"
              type="number"
              inputMode="numeric"
              enterKeyHint="done"
              min={13}
              max={120}
              placeholder="e.g. 27"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className={cn(!ageValid && age !== "" && "border-against")}
            />
            {!ageValid && age !== "" && (
              <p className="text-xs text-against-fg mt-1">
                Enter an age between 13 and 120.
              </p>
            )}
          </Field>

          <Field
            label="Location"
            size="md-lg"
            hint="City-level only — never shared publicly beyond a state or city breakdown."
          >
            <LocationField value={location} onChange={setLocation} />
          </Field>

          <Field label="Gender" size="md-lg">
            <div className="flex flex-wrap gap-2">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setGender(gender === option ? null : option);
                    setGenderMoreOpen(false);
                    setGenderMoreSelection("");
                    setGenderCustomText("");
                  }}
                  className={cn(
                    "flex-1 text-[13px] px-4 py-2 max-sm:min-h-11 rounded-sm border transition-colors cursor-pointer",
                    gender === option
                      ? "bg-ink text-paper border-ink"
                      : "bg-card text-text-secondary border-border hover:border-muted",
                  )}
                >
                  {option}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const nextOpen = !genderMoreOpen;
                  setGenderMoreOpen(nextOpen);
                  if (nextOpen && !isGenderMoreOption(gender)) {
                    setGender(null);
                  }
                }}
                className={cn(
                  "flex-1 text-[13px] px-4 py-2 max-sm:min-h-11 rounded-sm border transition-colors cursor-pointer",
                  "flex items-center justify-center gap-1.5",
                  isGenderMoreOption(gender)
                    ? "bg-ink text-paper border-ink"
                    : "bg-card text-text-secondary border-border hover:border-muted",
                )}
              >
                More
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className={cn(
                    "w-3.5 h-3.5 transition-transform",
                    genderMoreOpen && "rotate-180",
                  )}
                >
                  <path
                    d="M5 7.5L10 12.5L15 7.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {genderMoreOpen && (
              <div className="flex flex-col gap-2 mt-2">
                <Select
                  value={genderMoreSelection}
                  onChange={(e) => handleGenderMoreSelect(e.target.value)}
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {GENDER_MORE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>

                {genderMoreSelection === "Prefer to self-describe" && (
                  <Input
                    placeholder="How would you describe it?"
                    value={genderCustomText}
                    onChange={(e) => setGenderCustomText(e.target.value)}
                  />
                )}
              </div>
            )}
          </Field>

          <div className="border-t border-border pt-5">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="text-[13px] font-medium text-text-secondary hover:text-text transition-colors cursor-pointer flex flex-wrap items-center gap-x-1.5 text-left py-2 -my-2"
            >
              <span
                className={cn(
                  "inline-block transition-transform",
                  moreOpen && "rotate-90",
                )}
              >
                ›
              </span>
              More — education, occupation
              <span className="text-xs font-normal text-text-muted">
                (optional but recommended)
              </span>
            </button>

            {moreOpen && (
              <div className="flex flex-col gap-5 mt-5">
                <Field
                  label="Education"
                  htmlFor="education"
                  optional="optional but recommended"
                >
                  <Select
                    id="education"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {EDUCATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Occupation"
                  htmlFor="occupation"
                  optional="optional but recommended"
                >
                  <SearchableSelect
                    id="occupation"
                    options={OCCUPATIONS}
                    value={occupation}
                    onChange={setOccupation}
                    placeholder="Search or type your occupation"
                  />
                </Field>
              </div>
            )}
          </div>
        </form>
      </main>

      {/* Fixed to the viewport bottom, not the form flow — expanding the
          gender-more or education/occupation sections above must never
          shift this, since it's the one thing that should stay reachable
          the whole time. */}
      {/* hide-on-keyboard: while typing, a bar riding on the keyboard would
          cover the very field being filled in. It's back the moment the
          keyboard goes down. */}
      <div className="hide-on-keyboard fixed bottom-0 inset-x-0 z-30 border-t border-border bg-paper/95 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-5 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:py-4 flex items-center justify-between gap-4">
          <Button
            type="submit"
            form="onboarding-form"
            size="xl"
            disabled={!canSubmit}
            className="w-full px-8 py-3.5"
          >
            Continue
          </Button>
        </div>
      </div>

      {signInOffered && (
        <SignInModal
          title="Sign in to save your place"
          body="You can browse every ask without an account. You'll need to sign in with Google to cast a vote — it's how we keep it to one person, one set of votes."
          dismissLabel="Skip for now"
          onSignIn={() => auth.signInWithGoogle(next())}
          onClose={skipSignIn}
        />
      )}
    </div>
  );
}
