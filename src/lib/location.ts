export type LocationSource = "geolocation" | "pincode" | "search";

export interface ResolvedLocation {
  city: string;
  state: string;
  pincode?: string;
  source: LocationSource;
}

// Nominatim's usage policy requires a real User-Agent and caps free usage
// at ~1 request/second — fine for onboarding, which fires a handful of
// requests per session, not a bulk geocoder.
const NOMINATIM_HEADERS = {
  "User-Agent": "CitizenPoll/1.0 (civic accountability platform)",
};

export async function lookupPincode(
  pincode: string,
): Promise<{ city: string; state: string } | null> {
  const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
  if (!res.ok) return null;

  const data = await res.json();
  const record = data?.[0];
  if (record?.Status !== "Success" || !record.PostOffice?.length) return null;

  const office = record.PostOffice[0];
  return {
    city: (office.District as string).trim(),
    state: (office.State as string).trim(),
  };
}

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<{ city: string; state: string } | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&addressdetails=1`;
  const res = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!res.ok) return null;

  const data = await res.json();
  const addr = data?.address;
  if (!addr) return null;

  const city =
    addr.city || addr.town || addr.village || addr.county || addr.state_district;
  const state = addr.state;
  if (!city || !state) return null;

  return { city, state };
}

export interface CitySearchResult {
  city: string;
  state: string;
  displayName: string;
}

export async function searchCities(query: string): Promise<CitySearchResult[]> {
  if (query.trim().length < 2) return [];

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query,
  )}&countrycodes=in&format=json&addressdetails=1&limit=6&featureType=city`;
  const res = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!res.ok) return [];

  const data = await res.json();
  return (data as Array<Record<string, unknown>>)
    .map((item) => {
      const addr = item.address as Record<string, string> | undefined;
      const city =
        addr?.city || addr?.town || addr?.village || (item.name as string);
      const state = addr?.state;
      if (!city || !state) return null;
      return { city, state, displayName: item.display_name as string };
    })
    .filter((v): v is CitySearchResult => v !== null);
}

export function getBrowserLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 5 * 60_000,
    });
  });
}
