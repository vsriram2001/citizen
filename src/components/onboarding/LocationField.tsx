"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { revealOnFocus } from "@/components/mobile/useMediaQuery";
import {
  getBrowserLocation,
  lookupPincode,
  reverseGeocode,
  searchCities,
  type CitySearchResult,
  type LocationSource,
} from "@/lib/location";

export interface LocationValue {
  city: string;
  state: string;
  pincode?: string;
  source: LocationSource;
}

interface LocationFieldProps {
  value: LocationValue | null;
  onChange: (value: LocationValue | null) => void;
}

const PIN_ICON_LOOKS_LIKE_PINCODE = /^\d{1,6}$/;

const CheckIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 shrink-0">
    <circle cx="10" cy="10" r="10" fill="var(--color-support)" />
    <path
      d="M6 10.3l2.4 2.4L14 7"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="none" className={className}>
    <path
      d="M10 18s6-5.5 6-10a6 6 0 10-12 0c0 4.5 6 10 6 10z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="8" r="2" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

/** The site's location permission, or null where the browser can't say (older Safari). */
async function geolocationPermission(): Promise<PermissionState | null> {
  try {
    return (await navigator.permissions.query({ name: "geolocation" })).state;
  } catch {
    return null;
  }
}

export function LocationField({ value, onChange }: LocationFieldProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset per new query, before the debounced lookup
    setNotFound(false);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        if (/^\d{6}$/.test(trimmed)) {
          const resolved = await lookupPincode(trimmed);
          if (resolved) {
            onChange({ ...resolved, pincode: trimmed, source: "pincode" });
            setQuery("");
            setResults([]);
          } else {
            setNotFound(true);
            setResults([]);
          }
          return;
        }

        if (PIN_ICON_LOOKS_LIKE_PINCODE.test(trimmed)) {
          // Partial numeric input — likely a pincode still being typed.
          // Don't run a city search against digits.
          setResults([]);
          return;
        }

        const found = await searchCities(trimmed);
        setResults(found);
        setNotFound(found.length === 0);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, onChange]);

  async function handleFetchLocation() {
    setError(null);
    setNotFound(false);
    // Browsers only offer location on https (or localhost). Over plain http —
    // e.g. a phone opening the dev server by IP — the request is refused
    // without ever asking, which used to surface as "access denied".
    if (!window.isSecureContext) {
      setError("Location only works on a secure (https) connection. Type your city or pincode instead.");
      return;
    }
    setLocating(true);
    // Read the site's permission first: a "denied" that arrives without the
    // browser ever showing its prompt has two very different fixes.
    const before = await geolocationPermission();
    let position: GeolocationPosition;
    try {
      position = await getBrowserLocation();
    } catch (err) {
      const code = (err as GeolocationPositionError).code;
      setError(
        code === 1
          ? before === "denied"
            ? // Blocked for this site earlier — browsers never re-ask.
              "Location is blocked for this site. Click the icon left of the web address, allow Location, then try again — or type your city or pincode."
            : // The site was allowed to ask, yet was refused with no prompt:
              // the device has location switched off for this browser.
              "Your device has location turned off for this browser (on a Mac: System Settings → Privacy & Security → Location Services). Or just type your city or pincode."
          : code === 3
            ? "Finding your location took too long. Try again, or type your city or pincode."
            : "Couldn't get your location. Type your city or pincode instead.",
      );
      setLocating(false);
      return;
    }
    try {
      const resolved = await reverseGeocode(
        position.coords.latitude,
        position.coords.longitude,
      );
      if (!resolved) {
        setError("Couldn't determine your city from that location.");
        return;
      }
      onChange({ ...resolved, source: "geolocation" });
      setQuery("");
      setResults([]);
    } catch {
      setError("Couldn't look up your city just now. Type your city or pincode instead.");
    } finally {
      setLocating(false);
    }
  }

  function selectResult(result: CitySearchResult) {
    onChange({ city: result.city, state: result.state, source: "search" });
    setQuery("");
    setResults([]);
    setNotFound(false);
  }

  if (value) {
    return (
      <div className="flex items-center gap-2.5 bg-support-bg text-support-fg rounded-sm px-3 py-2.5 text-sm">
        <CheckIcon />
        <span className="flex-1">
          {value.city}, {value.state}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs underline decoration-current/40 hover:decoration-current cursor-pointer py-1.5 -my-1.5 px-1 -mx-1"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* The quick way comes first and says what it does: an unlabelled pin icon
          beside the field read as "why do you want this?", so people skipped
          it. The label says city because city is all it's after. */}
      <button
        type="button"
        onClick={handleFetchLocation}
        disabled={locating}
        className={cn(
          "w-full min-h-11 sm:min-h-10 flex items-center justify-center gap-2 px-3",
          "bg-card border border-border rounded-sm text-sm font-medium text-text",
          "hover:border-accent hover:text-accent transition-colors cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed",
        )}
      >
        <PinIcon className="w-[18px] h-[18px] shrink-0" />
        {locating ? "Finding your city…" : "Find my city automatically"}
      </button>

      <div className="flex items-center gap-3 text-xs text-text-muted" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        or type it
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            aria-label="City or pincode"
            placeholder="City or 6-digit pincode"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
            autoComplete="off"
            // Lift the field (and the label above it) to the top of the
            // visible area, so the city list opens above the keyboard.
            onFocus={revealOnFocus("start")}
            className={cn(
              "scroll-mt-12 w-full bg-card text-text placeholder:text-text-muted",
              "border border-border rounded-sm px-3 py-2.5 sm:py-2 text-sm",
              "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
            )}
          />
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full bg-card border border-border rounded-sm shadow-lg max-h-56 overflow-y-auto">
              {results.map((result, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => selectResult(result)}
                    className="w-full text-left px-3 py-3 sm:py-2 text-sm hover:bg-paper active:bg-paper cursor-pointer border-b border-border last:border-b-0"
                  >
                    <span className="font-medium">{result.city}</span>
                    <span className="text-text-muted">, {result.state}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {notFound && !loading && (
            <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-sm shadow-lg px-3 py-2.5">
              <p className="text-[13px] text-text-muted leading-snug">
                Couldn&apos;t find that. Try your 6-digit pincode, or{" "}
                <button
                  type="button"
                  onClick={handleFetchLocation}
                  className="underline decoration-text-muted/50 hover:decoration-text-muted cursor-pointer"
                >
                  find your city automatically
                </button>
                .
              </p>
            </div>
          )}
        </div>
      </div>

      {loading && <p className="text-xs text-text-muted">Looking that up…</p>}

      {error && <p className="text-xs text-against-fg">{error}</p>}
    </div>
  );
}
