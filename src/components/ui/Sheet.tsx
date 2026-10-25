"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/*
  The one overlay every dialog in the app is built on.

  Phones get a bottom sheet: it rises from the thumb's side of the screen,
  can be dragged down by its top edge, and pads itself clear of the home
  bar. From sm it's a centred dialog (placement="responsive", the default),
  or stays a bottom sheet at every width (placement="bottom", e.g. filters).

  The keyboard rule: the overlay is pinned to the *visible* viewport
  (--vv-top / --vv-height from components/mobile/ViewportVars), not the
  layout viewport. When a field inside opens the keyboard, the whole sheet
  shrinks to sit above it — header and actions stay on screen, only the
  middle scrolls — instead of the keyboard sliding over the bottom half.

  It never focuses a field on open (that would throw a keyboard up
  uninvited); focus goes to the panel itself and returns on close.
*/

type Width = "md" | "lg" | "xl";
type Size = "auto" | "full";

const WIDTH: Record<Width, string> = {
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-2xl",
};

// How far the sheet must be dragged down (px) before letting go closes it.
const DRAG_CLOSE_PX = 90;

// Open sheets, innermost last — Escape only closes the top one.
const stack: symbol[] = [];

let scrollLocks = 0;
let savedOverflow = { html: "", body: "" };

function lockScroll() {
  if (scrollLocks++ > 0) return;
  savedOverflow = {
    html: document.documentElement.style.overflow,
    body: document.body.style.overflow,
  };
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}

function unlockScroll() {
  if (--scrollLocks > 0) return;
  document.documentElement.style.overflow = savedOverflow.html;
  document.body.style.overflow = savedOverflow.body;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({
  onClose,
  title,
  eyebrow,
  description,
  label,
  footer,
  children,
  placement = "responsive",
  size = "auto",
  width = "md",
  dismissible = true,
  bodyClassName,
}: {
  onClose: () => void;
  /** Heading. Omit for a sheet whose content brings its own (filters). */
  title?: React.ReactNode;
  /** Small uppercase line above the title. */
  eyebrow?: string;
  description?: React.ReactNode;
  /** Accessible name when there's no title. */
  label?: string;
  /** Actions pinned under the scrolling body — usually <SheetActions>. */
  footer?: React.ReactNode;
  children?: React.ReactNode;
  /** "responsive": bottom sheet on phones, centred dialog from sm.
   *  "bottom": bottom sheet at every width. */
  placement?: "responsive" | "bottom";
  /** "full": a fixed tall sheet (long reads, two-pane panels). */
  size?: Size;
  width?: Width;
  /** False for a sheet holding unsaved edits: no backdrop tap, Escape or
   *  drag to close — only its own buttons. */
  dismissible?: boolean;
  bodyClassName?: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ startY: number; dy: number } | null>(null);
  // Latest onClose without re-running the mount effect when callers pass an
  // inline arrow.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const self = Symbol();
    stack.push(self);
    lockScroll();
    panelRef.current?.focus({ preventScroll: true });

    function onKey(e: KeyboardEvent) {
      if (stack[stack.length - 1] !== self) return;
      if (e.key === "Escape" && dismissible) {
        onCloseRef.current();
        return;
      }
      // Keep Tab inside the sheet.
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(self), 1);
      unlockScroll();
      // Back to whatever opened it — unless that was a text field, which
      // would pop the keyboard straight back up.
      if (previous && !previous.matches("input, textarea, select")) {
        previous.focus?.({ preventScroll: true });
      }
    };
  }, [dismissible]);

  // Drag-to-dismiss by the top edge (grabber + header) on phones. The body
  // isn't a drag zone, so scrolling the content never fights the gesture.
  function onPointerDown(e: React.PointerEvent) {
    if (!dismissible || e.pointerType === "mouse") return;
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ startY: e.clientY, dy: 0 });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    setDrag({ ...drag, dy: Math.max(0, e.clientY - drag.startY) });
  }
  function onPointerUp() {
    if (!drag) return;
    if (drag.dy > DRAG_CLOSE_PX) onClose();
    setDrag(null);
  }

  const responsive = placement === "responsive";
  const dragProps = { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp };

  return createPortal(
    <div
      className={cn(
        "fixed inset-x-0 z-50 top-[var(--vv-top,0px)] h-[var(--vv-height,100dvh)]",
        "flex flex-col justify-end items-center",
        responsive && "sm:justify-center sm:p-6",
      )}
    >
      <div
        aria-hidden
        className="sheet-backdrop absolute inset-0 bg-ink/40"
        onClick={dismissible ? onClose : undefined}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : label}
        tabIndex={-1}
        data-placement={placement}
        style={
          drag
            ? { transform: `translateY(${drag.dy}px)`, transition: "none" }
            : { transition: "transform 0.2s ease-out" }
        }
        className={cn(
          "sheet-panel relative w-full flex flex-col overflow-hidden bg-card outline-none shadow-lg",
          "border-t border-border rounded-t-card",
          // Never taller than the visible area, with a strip of backdrop
          // left above so it reads as a layer you can dismiss.
          "max-h-[calc(100%-1.5rem)]",
          size === "full" && "h-[calc(100%-1.5rem)]",
          WIDTH[width],
          responsive
            ? cn(
                "sm:border sm:rounded-card",
                size === "full" ? "sm:h-auto sm:max-h-[min(100%,56rem)]" : "sm:max-h-full",
              )
            : cn(
                "sm:border-x sm:max-w-lg",
                size === "full" && "sm:h-[min(82%,46rem)]",
              ),
        )}
      >
        {/* Grabber: phones only, and the handle for dragging the sheet down. */}
        <div
          {...dragProps}
          className={cn(
            "shrink-0 flex justify-center pt-2 touch-none",
            title ? "pb-1" : "pb-2",
            responsive && "sm:hidden",
          )}
        >
          <span aria-hidden className="h-1 w-10 rounded-sm bg-border" />
        </div>

        {title && (
          <div
            {...dragProps}
            className="shrink-0 flex items-start gap-3 px-5 pt-2 pb-3 sm:pt-5 touch-none sm:touch-auto"
          >
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              {eyebrow && (
                <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted">{eyebrow}</p>
              )}
              <h2 id={titleId} className="font-sans text-[17px] font-semibold leading-snug text-text tracking-normal">
                {title}
              </h2>
              {description && (
                <div className="text-sm text-text-secondary leading-relaxed">{description}</div>
              )}
            </div>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={cn(
                  "shrink-0 -mr-1.5 -mt-1 flex h-9 w-9 items-center justify-center rounded-sm cursor-pointer",
                  "text-text-muted hover:text-text hover:bg-border/40 active:bg-border/60 transition-colors",
                )}
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto overscroll-contain px-5",
            footer ? "pb-4" : "pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-border bg-card px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Footer button row. Phones: thumb-sized (44px), the last (primary) button
 * takes the remaining width so a long label never wraps. From sm: compact,
 * right-aligned, as on desktop dialogs.
 */
export function SheetActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2",
        "max-sm:*:min-h-11 max-sm:*:last:flex-1",
        className,
      )}
    >
      {children}
    </div>
  );
}
