"use client";

import { useState } from "react";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { SignInModal } from "@/components/auth/SignInModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sheet, SheetActions } from "@/components/ui/Sheet";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { PartyBadge, VerificationBadge } from "@/components/ui/Badge";
import { BallotAnimation } from "@/components/vote/BallotAnimation";
import { ReplaceVoteModal } from "@/components/vote/ReplaceVoteModal";
import { ReviewVotesModal } from "@/components/vote/ReviewVotesModal";
import { VotesSubmittedNotice } from "@/components/vote/VotesSubmittedNotice";
import { VoteMeter } from "@/components/vote/VoteMeter";
import { VoteTray } from "@/components/vote/VoteTray";
import { AskCard } from "@/components/ask/AskCard";
import type { Ask } from "@/lib/types";
import { AskList } from "@/components/ask/AskList";
import { AskInfoButton } from "@/components/ask/AskInfoButton";
import { FilterSidebar } from "@/components/search/SearchFilters";
import { useAskFilters } from "@/components/search/useAskFilters";
import { SEED_ASKS } from "@/lib/mock/asks";
import { PARTY_STATUS_LABEL, type PartyStatus } from "@/lib/status";

const SWATCHES = [
  { name: "Ink", hex: "#1A1A18", className: "bg-ink" },
  { name: "Paper", hex: "#FAFAF7", className: "bg-paper border border-border" },
  { name: "Card", hex: "#FFFFFF", className: "bg-card border border-border" },
  { name: "Border", hex: "#D9D7CF", className: "bg-border" },
  { name: "Accent", hex: "#2F4858", className: "bg-accent" },
  { name: "Muted", hex: "#8A8A82", className: "bg-muted" },
];

const STATUS_SWATCHES: { status: PartyStatus; hex: string; className: string }[] =
  [
    { status: "support", hex: "#2E7D46", className: "bg-support" },
    { status: "against", hex: "#B23A2E", className: "bg-against" },
    { status: "defected", hex: "#C9861D", className: "bg-defected" },
    { status: "no_response", hex: "#AFAFA6", className: "bg-noresponse" },
  ];

const SAMPLE_ASK: Ask = {
  id: "sample-1",
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
};

const COMPACT_ASK: Ask = {
  id: "sample-2",
  askText: "Publish police complaint resolution times monthly",
  currentValue: "Not published",
  targetValue: "Monthly public dashboard",
  timeframe: "2027",
  targetBody: "State Home Departments",
  verificationStatus: "verified",
  voteCount: 241,
  partyResponses: [
    { party: "Party A", status: "support" },
    { party: "Party D", status: "defected" },
  ],
};

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg">{title}</h2>
        {note && (
          <p className="text-[13px] text-text-secondary max-w-2xl leading-relaxed">
            {note}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

export default function DesignGallery() {
  const [used, setUsed] = useState(1);
  const [voted, setVoted] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [ballotPlaying, setBallotPlaying] = useState(false);
  const filterDemo = useAskFilters(SEED_ASKS);

  return (
    <main className="mx-auto max-w-3xl px-6 py-14 flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-widest text-text-muted">
          Internal reference
        </p>
        <h1 className="text-3xl">Design system</h1>
        <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
          Every token and primitive the product is built from. Palette values
          come from the palette file — this page renders them at real sizes so
          they can be judged in context rather than as hexes.
        </p>
      </header>

      <Section
        title="Typography"
        note="Playfair Display (weight 700) for headlines, Public Sans for body and UI. Serif headline over a neutral sans body — the Guardian/Vox register, picked after a type-specimen review."
      >
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-[40px] leading-[1.08]">
              What do you want changed?
            </h1>
            <p className="text-xs text-text-muted mt-1.5">
              Playfair Display · 700 · 40px · page headline
            </p>
          </div>
          <div>
            <h2 className="text-2xl">
              Raise public education spending from 2.9% to 6% of GDP
            </h2>
            <p className="text-xs text-text-muted mt-1.5">
              Playfair Display · 700 · 24px · ask headline
            </p>
          </div>
          <div>
            <h3 className="text-[17px]">
              Publish police complaint resolution times monthly
            </h3>
            <p className="text-xs text-text-muted mt-1.5">
              Playfair Display · 700 · 17px · card title
            </p>
          </div>
          <div>
            <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
              Body text in Public Sans — a neutral, highly legible grotesque
              built for civic and government interfaces. Stays legible from
              display sizes down to the 12–13px where most of this product
              actually lives.
            </p>
            <p className="text-xs text-text-muted mt-1.5">
              Public Sans · 400 · 14px · body
            </p>
          </div>
          <div>
            <p className="text-[13px] text-text-secondary">
              12,408 votes · 2 of 3 remaining · Karnataka
            </p>
            <p className="text-xs text-text-muted mt-1.5">
              Public Sans · 400 · 13px · dense UI metadata — the size that
              matters most here
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Palette"
        note="Grayscale base with a single muted slate accent. No pure blue, red, or yellow — those read as party colors in Indian political context, which would make the platform look aligned before a user reads a word."
      >
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {SWATCHES.map((s) => (
            <div key={s.name}>
              <div className={`h-14 rounded-sm ${s.className}`} />
              <p className="text-[11px] text-text-muted mt-1">{s.name}</p>
              <p className="text-[11px] text-text-muted font-mono">{s.hex}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Status tones"
        note="Functional status colors, deliberately desaturated. Used for party positions on an ask — never as decoration."
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATUS_SWATCHES.map((s) => (
            <div key={s.status}>
              <div className={`h-10 rounded-sm ${s.className}`} />
              <p className="text-[11px] text-text-muted mt-1">
                {PARTY_STATUS_LABEL[s.status]}
              </p>
              <p className="text-[11px] text-text-muted font-mono">{s.hex}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Badges"
        note="Two independent axes. Party status is where a named party stands; verification is whether we have checked the numbers ourselves. An ask can be verified and universally ignored, or unverified and popular — so these never collapse into one badge."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wide text-text-muted">
              Party status
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUS_SWATCHES.map((s) => (
                <PartyBadge key={s.status} status={s.status} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wide text-text-muted">
              With attribution
            </p>
            <div className="flex flex-wrap gap-2">
              <PartyBadge party="Party A" status="support" />
              <PartyBadge party="Party B" status="no_response" />
              <PartyBadge party="Party C" status="against" />
              <PartyBadge party="Party D" status="defected" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wide text-text-muted">
              Verification
            </p>
            <div className="flex flex-wrap gap-2">
              <VerificationBadge status="unverified" />
              <VerificationBadge status="verified" />
              <VerificationBadge status="disputed" />
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Buttons"
        note="Three variants, three sizes. Squared corners at 3px throughout."
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary">Cast your vote</Button>
            <Button variant="secondary">Edit votes</Button>
            <Button variant="ghost">Skip</Button>
            <Button variant="primary" disabled>
              No votes left
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </div>
      </Section>

      <Section
        title="Form fields"
        note="Optional fields are marked as optional. Onboarding has genuinely skippable questions, and a user should never have to guess which ones."
      >
        <Card className="flex flex-col gap-4 max-w-md">
          <Field label="Age bracket" htmlFor="age">
            <Select id="age" defaultValue="">
              <option value="" disabled>
                Select
              </option>
              <option>18–24</option>
              <option>25–34</option>
              <option>35–49</option>
              <option>50–64</option>
              <option>65+</option>
            </Select>
          </Field>
          <Field label="State" htmlFor="state" hint="Approximate location only.">
            <Input id="state" placeholder="e.g. Karnataka" />
          </Field>
          <Field label="Occupation" htmlFor="occupation" optional>
            <Input id="occupation" placeholder="e.g. Teacher" />
          </Field>
          <Field
            label="Mechanism"
            htmlFor="mechanism"
            hint="How would this actually be implemented?"
          >
            <Textarea id="mechanism" placeholder="Describe the mechanism" />
          </Field>
        </Card>
      </Section>

      <Section
        title="Votes submitted notice"
        note="Top of /search once all 3 votes are submitted. Vote buttons on other asks are disabled and the add-ask prompts are hidden."
      >
        <VotesSubmittedNotice />
      </Section>

      <Section
        title="Vote meter"
        note="Discrete segments, not a continuous bar. Three votes a year is the core mechanism — spending one should read as a token spent, not a task completed."
      >
        <Card className="flex flex-col gap-4 max-w-md">
          <VoteMeter used={used} />
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((n) => (
              <Button
                key={n}
                size="sm"
                variant={used === n ? "primary" : "secondary"}
                onClick={() => setUsed(n)}
              >
                {n} used
              </Button>
            ))}
          </div>
        </Card>
      </Section>

      <Section
        title="Vote tray and review"
        note="Pinned to the bottom of /search after the first vote: three pips for the budget and one action. Review lists the asks like a ballot slip, each removable, then Finish plays the ballot animation and lands on the share page."
      >
        <div className="flex flex-col gap-4">
          {/* transform makes the fixed tray position inside this box instead of the viewport */}
          <div className="relative h-24 max-w-xl [transform:translateZ(0)] overflow-hidden">
            <VoteTray used={used} onReview={() => setReviewOpen(true)} />
          </div>
          <p className="text-xs text-text-muted">Uses the &ldquo;used&rdquo; buttons above.</p>
          <div>
            <Button variant="secondary" onClick={() => setBallotPlaying(true)}>
              Play ballot animation
            </Button>
          </div>
        </div>
        {ballotPlaying && (
          <BallotAnimation
            asks={SEED_ASKS.slice(0, Math.max(used, 1))}
            onComplete={() => setBallotPlaying(false)}
          />
        )}
        {reviewOpen && (
          <ReviewVotesModal
            asks={SEED_ASKS.slice(0, Math.max(used, 1))}
            busyId={null}
            submittedIds={new Set()}
            onRemove={() => setUsed((u) => Math.max(u - 1, 0))}
            onFinish={() => setReviewOpen(false)}
            onClose={() => setReviewOpen(false)}
          />
        )}
      </Section>

      <Section
        title="Replace a vote"
        note="Tapping Vote at 3/3 opens this card: the ask they wanted, their current votes, and Replace on each. Submitted votes (after Finish) are locked and have no button."
      >
        <div>
          <Button variant="secondary" onClick={() => setReplaceOpen(true)}>
            Open replace card
          </Button>
        </div>
        {replaceOpen && (
          <ReplaceVoteModal
            wanted={SEED_ASKS[3]}
            current={SEED_ASKS.slice(0, 3)}
            submittedIds={new Set([SEED_ASKS[0].id])}
            busy={false}
            onReplace={() => setReplaceOpen(false)}
            onClose={() => setReplaceOpen(false)}
          />
        )}
      </Section>

      <Section
        title="Ask card"
        note="The recurring unit of the product. Full form shows the current→target delta and mechanism; compact form is for dense lists. Both always show verification status."
      >
        <div className="flex flex-col gap-4">
          <AskCard
            ask={SAMPLE_ASK}
            voted={voted}
            onVote={() => setVoted((v) => !v)}
          />
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-wide text-text-muted">
              Compact
            </p>
            <AskCard ask={COMPACT_ASK} compact onVote={() => {}} />
            <AskCard
              ask={{ ...SAMPLE_ASK, id: "s3", partyResponses: [] }}
              compact
              onVote={() => {}}
            />
            <p className="text-xs uppercase tracking-wide text-text-muted pt-2">
              Search hit — matched words underlined (`highlight`, from lib/match.ts)
            </p>
            <AskCard
              ask={COMPACT_ASK}
              compact
              highlight={COMPACT_ASK.askText.toLowerCase().split(/[^a-z0-9]+/).slice(1, 3)}
              onVote={() => {}}
            />
          </div>
        </div>
      </Section>

      <Section
        title="Ask info"
        note="The info icon beside the accountability icon. Opens the full brief: overview, a plea written as a letter, the reasoning, the downsides, and an add-your-thoughts form that only queues (a nightly job reviews). Drafted on first open, so this needs the LLM keys; it renders a 404 message for the sample ask here."
      >
        <div className="flex items-center gap-3">
          <AskInfoButton ask={SAMPLE_ASK} />
          <span className="text-xs text-text-muted">Click to open</span>
        </div>
      </Section>

      <Section
        title="Ask list"
        note="A ranked group of more than five. Shows the top five, then reveals five more per click. The thin bar on each card is its vote share relative to the leading ask."
      >
        <AskList asks={SEED_ASKS} />
      </Section>

      <Section
        title="Filter panel"
        note="Category rail on the left, that category's options on the right. Options within a category are OR-ed, categories are AND-ed; each count is how many asks you'd see after ticking it. On /search it sits in the sidebar on desktop and opens as a bottom sheet below lg."
      >
        <div className="max-w-[360px]">
          <FilterSidebar state={filterDemo} />
        </div>
        <p className="text-xs text-text-muted tabular-nums">
          {filterDemo.results.length} of {SEED_ASKS.length} seed asks match
        </p>
      </Section>

      <Section
        title="Sign-in prompt"
        note="Shown when a signed-out person taps Vote or adds an ask. Google sign-in exists only to keep votes one-per-person, and the copy says so."
      >
        <Button variant="secondary" onClick={() => setSignInOpen(true)}>
          Preview sign-in prompt
        </Button>
        {signInOpen && (
          <SignInModal onSignIn={async () => setSignInOpen(false)} onClose={() => setSignInOpen(false)} />
        )}
      </Section>

      <Section
        title="Sheet"
        note="Every dialog is built on this. Phones: a bottom sheet, dragged down by its top edge to close, padded clear of the home bar, and pinned to the visible viewport — when a field inside opens the keyboard the sheet shrinks above it instead of being covered. From sm: a centred dialog. It never focuses a field on open, so no keyboard appears uninvited."
      >
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>
          Preview sheet with a field
        </Button>
        {sheetOpen && (
          <Sheet
            title="A sheet with a field"
            description="Tap the field on a phone: the keyboard comes up and the sheet sits above it, actions still in reach."
            onClose={() => setSheetOpen(false)}
            footer={
              <SheetActions>
                <Button variant="ghost" size="sm" onClick={() => setSheetOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => setSheetOpen(false)}>
                  Save
                </Button>
              </SheetActions>
            }
          >
            <Field label="Your thought" htmlFor="sheet-demo">
              <Textarea id="sheet-demo" rows={3} placeholder="Type here" />
            </Field>
          </Sheet>
        )}
      </Section>

      <Section
        title="Site header"
        note="One header on every page: wordmark home, Browse asks, My votes, Share, Sign out once signed in. Pages pass extras (the search screen's vote total) as children. Below sm the links fold into a Menu button (components/nav/MobileNav.tsx)."
      >
        <div className="border border-border rounded-card overflow-hidden">
          <SiteHeader />
        </div>
      </Section>

      <Section
        title="Radius scale"
        note="Two steps only. 3px for small elements, 6px for cards. The spec allows 2–6px; anything above that starts reading as a consumer app rather than a record."
      >
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="h-16 w-28 bg-card border border-border rounded-sm" />
            <p className="text-[11px] text-text-muted">3px · sm</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="h-16 w-28 bg-card border border-border rounded-card" />
            <p className="text-[11px] text-text-muted">6px · card</p>
          </div>
        </div>
      </Section>
    </main>
  );
}
