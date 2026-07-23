// Shared "open in maps" logic for spot coordinates — used by SpotIdentityCard
// and (Sprint 2) LocatorMap. Native geo: URIs open Apple/Google Maps directly
// on mobile; desktop browsers have no geo: handler, so there we fall back to
// a Google Maps web link in a new tab.

const isMobile = () =>
  typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export function geoUri(lat: number, lng: number): string {
  return `geo:${lat},${lng}?q=${lat},${lng}`;
}

export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** href (+ target/rel for the desktop fallback) for a "open in maps" link,
 *  picked by device: geo: in place on mobile, Google Maps in a new tab
 *  everywhere else. */
export function mapLinkProps(
  lat: number,
  lng: number
): { href: string; target?: "_blank"; rel?: string } {
  if (isMobile()) return { href: geoUri(lat, lng) };
  return { href: googleMapsUrl(lat, lng), target: "_blank", rel: "noopener noreferrer" };
}

export function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
