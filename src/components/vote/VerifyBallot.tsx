"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import {
  BallotResult,
  type Check,
  type OpenBallot,
} from "@/components/vote/BallotResult";
import { ballotSaveMethod, readBallotPasskey } from "@/lib/ballot-passkey";
import {
  ballotKey,
  findBrokenBlock,
  parseBallotId,
  voteLeaf,
  type LedgerBlock,
} from "@/lib/ledger";
import { LEDGER_PAGE_SIZE } from "@/lib/ledger-read";

async function readChain(): Promise<LedgerBlock[]> {
  const chain: LedgerBlock[] = [];
  for (;;) {
    const res = await fetch(`/api/ledger?after=${chain.at(-1)?.height ?? 0}`);
    if (!res.ok) throw new Error("ledger unavailable");
    const { blocks } = (await res.json()) as { blocks: LedgerBlock[] };
    chain.push(...blocks);
    if (blocks.length < LEDGER_PAGE_SIZE) return chain;
  }
}

/** Every check runs here in the browser, so none of it takes the server's word. */
async function checkBallot({ ballotId, blocks, votes }: OpenBallot): Promise<Check[]> {
  const key = await ballotKey(ballotId);
  const sealed = new Set(blocks.flatMap((b) => b.leaves));
  const leaves = await Promise.all(votes.map((v) => voteLeaf(ballotId, v.askId)));
  const removed = sealed.size - new Set(leaves).size;

  const belongs = blocks.every((b) => b.ballotKey === key);
  const heights = blocks.map((b) => `#${b.height}`).join(", ");
  const found: Check = belongs
    ? {
        ok: true,
        title: "Found on the public ledger",
        detail: `Sealed in block ${heights}.`,
      }
    : {
        ok: false,
        title: "This ID doesn’t match its ledger entry",
        detail: "The blocks returned belong to a different ballot.",
      };

  const voteCheck: Check = leaves.every((l) => sealed.has(l))
    ? {
        ok: true,
        title: "Votes match what was sealed",
        detail:
          removed > 0
            ? `${removed} sealed vote${removed === 1 ? " is" : "s are"} no longer shown, usually because the ask was removed.`
            : "Each vote was recomputed and found in the block.",
      }
    : {
        ok: false,
        title: "Votes don’t match what was sealed",
        detail: "They may have been altered after sealing.",
      };

  const chain = await readChain();
  const broken = await findBrokenBlock(chain);
  const onChain = blocks.every((b) => chain[b.height - 1]?.hash === b.hash);
  const chainCheck: Check =
    broken === null && onChain
      ? {
          ok: true,
          title: "Ledger is unbroken",
          detail:
            chain.length === 1
              ? "Its 1 block is intact."
              : `All ${chain.length} blocks link up.`,
        }
      : {
          ok: false,
          title: "Ledger doesn’t add up",
          detail:
            broken === null
              ? "This ballot’s blocks aren’t in the public ledger."
              : `It breaks at block ${broken}: something changed after it was sealed.`,
        };

  return [found, voteCheck, chainCheck];
}

/**
 * Enter a Ballot ID, see its votes, and watch the proof run. The ID is held in
 * state only, never in the URL: a link would land it in browser history. Once a
 * ballot opens the form steps aside, so the screen holds one thing: the answer.
 */
export function VerifyBallot() {
  const [input, setInput] = useState("");
  const [showId, setShowId] = useState(false);
  const [canUsePasskey, setCanUsePasskey] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ballot, setBallot] = useState<OpenBallot | null>(null);
  const [checks, setChecks] = useState<Check[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    ballotSaveMethod().then((method) => {
      if (!cancelled) setCanUsePasskey(method === "passkey");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = parseBallotId(input);
    if (!id) {
      setError("That isn't a valid Ballot ID. Check for a mistyped character.");
      return;
    }
    lookUp(id);
  }

  async function openWithPasskey() {
    setError(null);
    try {
      const id = await readBallotPasskey();
      if (!id) {
        setError("That passkey doesn't hold a Ballot ID.");
        return;
      }
      setInput(id);
      await lookUp(id);
    } catch {
      setError("No passkey was opened. Enter your Ballot ID instead.");
    }
  }

  async function lookUp(id: string) {
    setChecks(null);
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/ballot/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't look up that ID. Try again.");
        return;
      }
      setBallot(data);
      window.scrollTo({ top: 0 });
      setChecks(await checkBallot(data));
    } catch {
      // Back to the form: a half-finished proof must not read as a result.
      setBallot(null);
      setError("Couldn't reach the ledger. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function reset() {
    setBallot(null);
    setChecks(null);
    setInput("");
    setShowId(false);
    window.scrollTo({ top: 0 });
  }

  if (ballot) return <BallotResult ballot={ballot} checks={checks} onReset={reset} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] sm:text-[32px] leading-[1.08]">Verify a ballot</h1>
        <p className="text-[15px] text-text-secondary leading-relaxed">
          Enter a Ballot ID to see its votes. Your own browser checks them against the public
          ledger, so you don&rsquo;t have to take our word for it.
        </p>
      </div>

      <div className="bg-card border border-border rounded-card p-5 sm:p-6 flex flex-col gap-4">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Ballot ID" htmlFor="ballot-id">
            <div className="relative">
              {/* A password field, so a saved ID autofills from the person's vault. */}
              <Input
                id="ballot-id"
                type={showId ? "text" : "password"}
                name="password"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError(null);
                }}
                placeholder="CP26-XXXXX-XXXXX-XXXXX-XXXXX"
                autoComplete="current-password"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={!!error}
                className="font-mono text-[13px] sm:text-[13px] pr-14"
              />
              <button
                type="button"
                onClick={() => setShowId((v) => !v)}
                aria-pressed={showId}
                className="absolute right-0 inset-y-0 px-3 text-[12px] text-accent cursor-pointer hover:underline underline-offset-4"
              >
                {showId ? "Hide" : "Show"}
              </button>
            </div>
          </Field>
          {error && (
            <p role="alert" className="text-[13px] text-against-fg">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending || !input.trim()} className="w-full">
            {pending ? "Checking…" : "Check ballot"}
          </Button>
        </form>

        {canUsePasskey && (
          <>
            <div className="flex items-center gap-3 text-[12px] text-text-muted">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              variant="secondary"
              onClick={openWithPasskey}
              disabled={pending}
              className="w-full"
            >
              Open with passkey
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
