"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ballotSaveMethod, saveBallotPasskey, type SaveMethod } from "@/lib/ballot-passkey";

type PasswordCredentialCtor = new (data: {
  id: string;
  password: string;
  name?: string;
}) => Credential;

/**
 * Saves a Ballot ID to the person's vault as {year}_citizen_poll: a passkey on
 * Mac and iPhone (lib/ballot-passkey.ts), a password in Google Password Manager
 * on Android. No site can write to a vault directly; it can only ask.
 *
 * Chrome and Edge have an API for asking to save a password. Safari and Firefox
 * don't: they only offer when a real login form is submitted and the page
 * navigates, so this is a real form, posting to a route that sends the person
 * straight back. Fields hidden with display:none get ignored, hence sr-only.
 *
 * `compact` is the small "Save" beside the ID on the share card, where there's
 * no room for a long label, so the by-hand steps wait until they've tapped it.
 */
export function SaveBallotId({
  id,
  year,
  from,
  compact = false,
}: {
  id: string;
  year: number;
  from: "votes" | "verify";
  compact?: boolean;
}) {
  const username = `${year}_citizen_poll`;
  const [method, setMethod] = useState<SaveMethod>("password");
  const [android, setAndroid] = useState(false);
  const [status, setStatus] = useState<"idle" | "asked" | "saved" | "failed">("idle");

  useEffect(() => {
    let cancelled = false;
    ballotSaveMethod().then((m) => {
      if (cancelled) return;
      setMethod(m);
      setAndroid(/android/i.test(navigator.userAgent));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;

    if (method === "passkey" && status !== "failed") {
      e.preventDefault();
      try {
        await saveBallotPasskey(id, year);
        setStatus("saved");
      } catch {
        // Cancelled, or the device refused. The password route is still there.
        setMethod("password");
        setStatus("failed");
      }
      return;
    }

    const Ctor = (window as unknown as { PasswordCredential?: PasswordCredentialCtor })
      .PasswordCredential;
    if (!Ctor) return; // Let the form submit.

    e.preventDefault();
    try {
      await navigator.credentials.store(
        new Ctor({ id: username, password: id, name: "Citizen Poll Ballot ID" }),
      );
      setStatus("asked");
    } catch {
      form.submit();
    }
  }

  return (
    <form method="post" action="/api/ballot/saved" onSubmit={save} className="contents">
      <input type="hidden" name="from" value={from} />
      <input
        className="sr-only"
        type="text"
        name="username"
        autoComplete="username"
        defaultValue={username}
        tabIndex={-1}
        aria-hidden
      />
      <input
        className="sr-only"
        type="password"
        name="password"
        autoComplete="current-password"
        defaultValue={id}
        tabIndex={-1}
        aria-hidden
      />
      <Button
        type="submit"
        variant="secondary"
        size={compact ? "sm" : undefined}
        aria-label={compact && status !== "saved" ? "Save your Ballot ID" : undefined}
        disabled={status === "saved"}
      >
        {status === "saved"
          ? "Saved"
          : compact
            ? "Save"
            : method === "passkey"
              ? "Save with passkey"
              : android
                ? "Save to Google Password Manager"
                : "Save to passwords"}
      </Button>

      {status === "saved" ? (
        <p className="w-full text-[13px] text-text-secondary leading-relaxed">
          Saved as <span className="font-mono text-text">{username}</span>. Open it any time from
          the Verify page.
        </p>
      ) : method === "password" && (!compact || status !== "idle") ? (
        /* Shown whenever a password is the route: browsers can stay silent
           (private windows, "never for this site", values no one typed), and a
           site can't tell or force it. */
        <p className="w-full text-[13px] text-text-secondary leading-relaxed">
          {status === "failed" ? "The passkey wasn’t saved. " : ""}
          {status === "asked" ? "Look for your browser’s save prompt. " : ""}No prompt? Add it
          to your password manager by hand: username{" "}
          <span className="font-mono text-text select-all break-all">{username}</span>, password{" "}
          <span className="font-mono text-text select-all break-all">{id}</span>. In Chrome, go to
          Settings, then Password Manager, then Add.
        </p>
      ) : null}
    </form>
  );
}
