"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Two modes, picked by whether `downloadName` is set:
 *
 * - Link share (default): navigator.share({ url }) where available,
 *   copy-to-clipboard fallback everywhere else.
 * - Image share (`downloadName` set): fetches `url` as a file and shares it
 *   via navigator.share({ files }) — the actual image lands in the share
 *   sheet (WhatsApp, iMessage, Twitter all accept it directly), not just a
 *   link to it. Falls back to triggering a browser download when file
 *   sharing isn't supported.
 *
 * `url` should be absolute — share sheets and clipboard both need a link
 * that works outside the current tab.
 */
export function ShareButton({
  url,
  title,
  text,
  label = "Share",
  desktopLabel,
  caption,
  forceCopy,
  variant = "secondary",
  downloadName,
  className,
}: {
  url: string;
  title?: string;
  text?: string;
  label?: string;
  /** Label on desktop, where the button copies instead of opening a share sheet. */
  desktopLabel?: string;
  /** Image mode, desktop: text pasted along with the image (invite + link). */
  caption?: string;
  /** Image mode: copy to the clipboard even on touch devices (no share sheet). */
  forceCopy?: boolean;
  variant?: "primary" | "secondary";
  /** Set to share/download `url` as an image file instead of sharing the link. */
  downloadName?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "done" | "busy">("idle");
  // Phones get the native share sheet; desktop always copies (see shareImage).
  // Server snapshot is false so server and first client render match.
  const isTouch = useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false,
  );

  // Image mode: fetch the card as soon as the page opens. Phone browsers
  // (Safari above all) only open the share sheet straight off a tap — fetching
  // the image after the tap (a second or more on a cold serverless start)
  // uses that window up, and navigator.share is then refused silently.
  const fileRef = useRef<File | null>(null);
  useEffect(() => {
    if (!downloadName) return;
    let cancelled = false;
    fileRef.current = null;
    fetch(url)
      .then((r) => r.blob())
      .then((blob) => {
        if (!cancelled) fileRef.current = new File([blob], downloadName, { type: blob.type });
      })
      .catch(() => {
        // Fetched on tap instead.
      });
    return () => {
      cancelled = true;
    };
  }, [url, downloadName]);

  async function shareImage() {
    // Ready file + phone: share before anything else is awaited, so the tap
    // still counts as the gesture that opened the sheet.
    const ready = fileRef.current;
    if (ready && isTouch && !forceCopy && navigator.canShare?.({ files: [ready] })) {
      try {
        await navigator.share({ files: [ready], text });
      } catch {
        // Cancelled the share sheet — not an error.
      }
      return;
    }

    setStatus("busy");
    try {
      // Desktop browsers: the OS share sheet (macOS "Copy" in particular) puts
      // the file path and the text on the clipboard together, and WhatsApp
      // pastes that as two images plus a path. Copy the picture itself instead.
      if ((forceCopy || !isTouch) && typeof ClipboardItem !== "undefined") {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              "image/png": fetch(url).then((r) => r.blob()),
              ...(caption && {
                "text/plain": new Blob([caption], { type: "text/plain" }),
              }),
            }),
          ]);
          setStatus("done");
          setTimeout(() => setStatus("idle"), 2000);
          return;
        } catch {
          // Clipboard blocked — fall through to download below.
        }
      }

      let file = fileRef.current;
      if (!file) {
        const fetched = await (await fetch(url)).blob();
        file = new File([fetched], downloadName!, { type: fetched.type });
      }
      const blob: Blob = file;

      if (isTouch && navigator.canShare?.({ files: [file] })) {
        try {
          // Text rides along as the caption where the target supports it
          // (Android WhatsApp); some iOS targets send it as a second message.
          await navigator.share({ files: [file], text });
          setStatus("idle");
          return;
        } catch (err) {
          // Closing the sheet isn't a failure — don't follow it with a download.
          if ((err as Error).name === "AbortError") {
            setStatus("idle");
            return;
          }
          // Refused (e.g. the tap's window expired while fetching) — download instead.
        }
      }

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = downloadName!;
      a.click();
      URL.revokeObjectURL(objectUrl);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("idle");
    }
  }

  async function shareLink() {
    if (isTouch && typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ url, title, text });
      } catch {
        // User cancelled the share sheet — not an error.
      }
      return;
    }

    try {
      const clipboardText = text ? `${text}\n${url}` : url;
      await navigator.clipboard.writeText(clipboardText);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      // Clipboard unavailable — nothing else to fall back to.
    }
  }

  const handleClick = downloadName ? shareImage : shareLink;
  const doneLabel = downloadName ? "Image copied" : "Link copied";

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      disabled={status === "busy"}
      className={className}
    >
      {status !== "busy" && (downloadName ? <ShareIcon /> : <LinkIcon />)}
      {status === "busy" ? "Preparing…" : status === "done"
            ? doneLabel
            : !isTouch && desktopLabel
              ? desktopLabel
              : label}
    </Button>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-[15px] h-[15px] shrink-0">
      <path
        d="M10 3v10.5M6 7l4-4 4 4M4 13v2.5a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5V13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="w-[15px] h-[15px] shrink-0">
      <path
        d="M8 12a2.5 2.5 0 0 0 3.5.2l3-3a2.5 2.5 0 0 0-3.5-3.5l-1.2 1.15M12 8a2.5 2.5 0 0 0-3.5-.2l-3 3a2.5 2.5 0 0 0 3.5 3.5l1.2-1.15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
