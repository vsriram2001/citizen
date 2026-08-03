"use client";

import { useEffect, useState } from "react";

/*
  Dev-only font switcher.

  Sets --font-sans on <html>, so every element inheriting the token swaps at
  once — you're judging the real page, not a specimen grid.

  Faces marked `standIn` are free equivalents for commercial faces on the
  shortlist (Gotham, Avenir, GT America, Diatype, Futura, ITC Garamond,
  Network Sans, Wayfinding Sans). Those originals need paid webfont licenses;
  these sit in the same design space so the direction is judgeable before
  spending money.

  Remove this component and its <link> before launch — it pulls ~14 families
  from Google Fonts, which is fine locally and unacceptable in production.
*/

interface FontOpt {
  label: string;
  stack: string;
  /** Optional separate display face — set for pairings, omitted for single-face options. */
  displayStack?: string;
  note: string;
  standIn?: string;
  group: "Pairings" | "Single face";
}

const FONTS: FontOpt[] = [
  /* ---- Pairings: different display and body faces ---------------------- */
  {
    label: "Libre Franklin + Inter",
    stack: "'Inter', sans-serif",
    displayStack: "'Libre Franklin', sans-serif",
    note: "Franklin Gothic headlines over a neutral screen sans. Closest open reconstruction of the Vox structure.",
    standIn: "Balto + Alright Sans",
    group: "Pairings",
  },
  {
    label: "Libre Franklin + Inter Tight",
    stack: "'Inter Tight', sans-serif",
    displayStack: "'Libre Franklin', sans-serif",
    note: "Same pairing, tighter body. Denser UI, more contemporary.",
    standIn: "Balto + Alright Sans",
    group: "Pairings",
  },
  {
    label: "Libre Franklin + Geist",
    stack: "var(--font-geist-sans), system-ui, sans-serif",
    displayStack: "'Libre Franklin', sans-serif",
    note: "Franklin headlines over the current body face. Keeps the sharpness below the fold.",
    group: "Pairings",
  },
  {
    label: "Archivo + Inter",
    stack: "'Inter', sans-serif",
    displayStack: "'Archivo', sans-serif",
    note: "Flatter, squarer gothic headline than Franklin. Sharper cut.",
    group: "Pairings",
  },

  /* ---- Single face across every slot ----------------------------------- */
  {
    label: "Libre Franklin",
    stack: "'Libre Franklin', sans-serif",
    note: "Franklin Gothic revival throughout. Round shoulders, open apertures.",
    standIn: "ITC Franklin Gothic",
    group: "Single face",
  },
  {
    label: "Inter",
    stack: "'Inter', sans-serif",
    note: "The screen-UI default. Neutral, high x-height.",
    standIn: "Alright Sans",
    group: "Single face",
  },
  {
    label: "Inter Tight",
    stack: "'Inter Tight', sans-serif",
    note: "Inter with tighter spacing. Crisper at display sizes.",
    group: "Single face",
  },
  {
    label: "Geist Sans",
    stack: "var(--font-geist-sans), system-ui, sans-serif",
    note: "Current. Self-hosted, OFL.",
    standIn: "Diatype / GT America",
    group: "Single face",
  },
  {
    label: "Archivo",
    stack: "'Archivo', sans-serif",
    note: "Grotesque, flat-sided, sturdy.",
    group: "Single face",
  },
  {
    label: "Figtree",
    stack: "'Figtree', sans-serif",
    note: "Geometric with humanist warmth.",
    standIn: "Avenir",
    group: "Single face",
  },
  {
    label: "Montserrat",
    stack: "'Montserrat', sans-serif",
    note: "Wide, confident, approachable.",
    standIn: "Gotham",
    group: "Single face",
  },
  {
    label: "Jost",
    stack: "'Jost', sans-serif",
    note: "High geometry, mid-century feel.",
    standIn: "Futura",
    group: "Single face",
  },
  {
    label: "Nunito Sans",
    stack: "'Nunito Sans', sans-serif",
    note: "Rounded terminals, friendliest here.",
    standIn: "Avenir (warmth)",
    group: "Single face",
  },
  {
    label: "Space Grotesk",
    stack: "'Space Grotesk', sans-serif",
    note: "Flat sides, squarer terminals, some signature.",
    standIn: "Grotesque",
    group: "Single face",
  },
  {
    label: "Familjen Grotesk",
    stack: "'Familjen Grotesk', sans-serif",
    note: "Angular edges, real character.",
    standIn: "Grotesque",
    group: "Single face",
  },
  {
    label: "Hanken Grotesk",
    stack: "'Hanken Grotesk', sans-serif",
    note: "Quiet neo-grotesque, very legible small.",
    standIn: "Grotesque",
    group: "Single face",
  },
  {
    label: "Manrope",
    stack: "'Manrope', sans-serif",
    note: "Semi-geometric, modern, slightly technical.",
    group: "Single face",
  },
  {
    label: "Outfit",
    stack: "'Outfit', sans-serif",
    note: "Clean geometric, even widths.",
    standIn: "Futura-adjacent",
    group: "Single face",
  },
  {
    label: "Public Sans",
    stack: "'Public Sans', sans-serif",
    note: "US federal design system face.",
    standIn: "Wayfinding Sans",
    group: "Single face",
  },
  {
    label: "Instrument Serif",
    stack: "'Instrument Serif', serif",
    note: "High-contrast serif. Display use — try it to see the register shift.",
    standIn: "ITC Garamond (contrast)",
    group: "Single face",
  },
  {
    label: "EB Garamond",
    stack: "'EB Garamond', serif",
    note: "Classical old-style serif.",
    standIn: "ITC Garamond",
    group: "Single face",
  },
];

const STORAGE_KEY = "citizen:font";

export function FontSwitcher() {
  /* Lazy initialiser rather than a restore-in-effect: reading storage during
     the first client render avoids a set-state-in-effect round trip. Guarded
     for the server pass, where `window` doesn't exist. */
  const [active, setActive] = useState(() => {
    if (typeof window === "undefined") return FONTS[0].label;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved && FONTS.some((f) => f.label === saved)
      ? saved
      : FONTS[0].label;
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const font = FONTS.find((f) => f.label === active);
    if (!font) return;
    const root = document.documentElement;
    root.style.setProperty("--font-sans", font.stack);
    // Single-face options point display at the same stack, so headings follow
    // the body face instead of keeping a stale pairing's display font.
    root.style.setProperty("--font-display", font.displayStack ?? font.stack);
    window.localStorage.setItem(STORAGE_KEY, font.label);
  }, [active]);

  const current = FONTS.find((f) => f.label === active) ?? FONTS[0];
  const groups = ["Pairings", "Single face"] as const;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font --
          Intentional: this is a dev-only preview tool, not a shipped font
          strategy. The chosen face gets self-hosted via next/font and this
          whole component is deleted. */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&family=Inter+Tight:wght@400;500;600;700;800&family=Archivo:wght@400;500;600;700;800&family=Figtree:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Jost:wght@400;500;600;700&family=Nunito+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Familjen+Grotesk:wght@400;500;600;700&family=Hanken+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Public+Sans:wght@400;500;600;700&family=Instrument+Serif&family=EB+Garamond:wght@400;500;600;700&display=swap"
      />

      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {open && (
          <div className="w-[290px] max-h-[62vh] overflow-y-auto bg-card border border-border rounded-card shadow-lg">
            <div className="sticky top-0 bg-card border-b border-border px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">
                Preview font — dev only
              </p>
            </div>
            {groups.map((g) => (
              <div key={g}>
                <p className="px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-[0.14em] text-text-muted">
                  {g}
                </p>
                <ul className="px-1.5 pb-1.5 flex flex-col gap-0.5">
                  {FONTS.filter((f) => f.group === g).map((f) => {
                    const isActive = f.label === active;
                    return (
                      <li key={f.label}>
                        <button
                          onClick={() => setActive(f.label)}
                          className={`w-full text-left px-2.5 py-2 rounded-sm transition-colors ${
                            isActive
                              ? "bg-accent text-paper"
                              : "hover:bg-border/40 text-text"
                          }`}
                        >
                          {/* Label renders in the display face; the note below
                              renders in the body face, so a pairing previews
                              both of its halves in one row. */}
                          <span
                            className="block text-[15px] font-semibold leading-tight"
                            style={{
                              fontFamily: f.displayStack ?? f.stack,
                            }}
                          >
                            {f.label}
                          </span>
                          <span
                            className={`block text-[11px] leading-snug mt-0.5 ${
                              isActive ? "text-paper/70" : "text-text-muted"
                            }`}
                            style={{ fontFamily: f.stack }}
                          >
                            {f.standIn ? `↔ ${f.standIn} · ` : ""}
                            {f.note}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 bg-ink text-paper text-[13px] font-medium px-3.5 py-2 rounded-sm shadow-lg hover:opacity-90 transition-opacity"
        >
          <span className="text-paper/55 text-[11px] uppercase tracking-wider">
            Font
          </span>
          <span>{current.label}</span>
          <span className="text-paper/55">{open ? "▾" : "▴"}</span>
        </button>
      </div>
    </>
  );
}
