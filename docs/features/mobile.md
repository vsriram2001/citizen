# Mobile

## Goal
Most people will meet this on a phone. Every screen should work one-handed at 320–430px,
and the on-screen keyboard must never cover the thing you're typing into or the button
you need next.

## Current state (built 2026-10-25)
- **Foundation**
  - `app/layout.tsx` exports `viewport`: `viewportFit: cover`, plus `interactiveWidget:
    resizes-content` so Android shrinks the layout for the keyboard.
  - `components/mobile/ViewportVars.tsx` publishes the *visible* viewport as
    `--vv-height` / `--vv-top` / `--kb-inset`, and sets `html[data-keyboard=open]` while a
    keyboard is up. iOS never resizes the layout for its keyboard, so this is the only signal there.
  - `globals.css`: 16px fields on touch screens (stops iOS zooming in on focus), no tap
    flash, `.hide-on-keyboard`, `.keyboard-room`, `no-scrollbar`, sheet animations.
  - `components/mobile/useMediaQuery.ts`: `useIsTouch()`, `revealOnFocus()`.
- **`components/ui/Sheet.tsx`** is the base of every dialog (Confirm, Sign-in, Review votes,
  Replace vote, Review submission, Ask info, Filters, Who's responsible, Tags).
  - On phones it's a bottom sheet: drag it down by the top edge, padded for the home bar.
  - It is pinned to the visible viewport, so with the keyboard up it shrinks above the
    keyboard and its actions stay in reach.
  - It never auto-focuses a field.
  - From sm it's a centred dialog (`placement="bottom"` keeps it a sheet).
- **Header**: below sm the links fold into a Menu button (`components/nav/MobileNav.tsx`).
- **Search**
  - Compact ask cards put votes + Vote on their own row under the ask.
  - Search box: `type=search`, a Search key that puts the keyboard away, a clear button,
    and the keyboard drops when you start scrolling results.
  - Filter chips scroll sideways in one row.
  - The vote tray docks full-width and hides while typing.
- **Popovers** (people, tags): hover on desktop; tap → bottom sheet on touch. Popovers used
  to open and immediately re-close on a tap.
- **Onboarding**: page scroll on phones (not an inner scroll box); Continue hides while
  typing; the city / occupation fields lift themselves so their lists open above the keyboard.
- **Home**: the hero photo shows on phones (its panel had zero width), CTA full width.

## Rules for new UI
- Overlays: use `Sheet`. Don't hand-roll a `fixed inset-0` modal.
- Anything pinned to the bottom of a page: add `hide-on-keyboard` and
  `pb-[max(…,env(safe-area-inset-bottom))]`.
- Hover-only disclosure needs a touch path (`useIsTouch` → sheet). Gate hover handlers on
  `pointerType === "mouse"`.
- Tap targets ≥ 40px on phones (`max-sm:min-h-11`, or an `after:-inset-*` hit area for icons).
- Never autofocus a text field on a phone; never set `maximum-scale` (zoom is accessibility).
- Check at 320px and 375px: no sideways page scroll.

## Edges to polish next
1. Not yet tried on real devices (only headless Chrome with a simulated keyboard). Test on
   iOS Safari and Android Chrome, especially onboarding with the keyboard up.
2. Sheets have no exit animation (they unmount at once).
3. Search: the sticky search + "Popular" row is ~110px; consider collapsing the heading on
   scroll.
4. The ballot animation and share images were not reworked for phones beyond spacing.
5. `/design` is still a desktop-first page.

## Done when
Real-device pass on iOS and Android with no keyboard overlap and no sideways scroll,
`npm run check` passes.
