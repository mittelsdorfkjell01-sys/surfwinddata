import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { formatCoords, mapLinkProps } from "../lib/mapLinks";

/** Leaflet renders no tiles when its container was sized 0 at init. */
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

const markerIcon = L.divIcon({
  className: "swd-locator-pin",
  html: `<svg width="26" height="34" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.7 0 1 4.7 1 10.7 1 18.4 12 30 12 30s11-11.6 11-19.3C23 4.7 18.3 0 12 0Z"
        fill="#E0823C" stroke="#ffffff" stroke-width="1.4"/>
      <circle cx="12" cy="10.5" r="3.4" fill="#ffffff"/>
    </svg>`,
  iconSize: [26, 34],
  iconAnchor: [13, 34],
});

/**
 * Quiet locator map: where the spot sits in the region (zoom ~11), not the
 * beach itself — that's `SpotFlowMap`'s job on the Daten tab. Purely a
 * picture, not an interactive map: no drag/scroll/zoom, no wind/wave overlay,
 * no legend. The whole card is one link to Google Maps / the device's map
 * app (same `mapLinks` logic as `SpotIdentityCard`), so there's no separate
 * control to tab to.
 */
export default function LocatorMap({ coords }: { coords: [number, number] }) {
  const [lat, lng] = coords;

  return (
    <a
      {...mapLinkProps(lat, lng)}
      role="link"
      aria-label="Auf Google Maps öffnen"
      className="group block"
    >
      <div className="aspect-[16/9] w-full overflow-hidden rounded-3xl transition-transform duration-300 group-hover:scale-[1.01]">
        <MapContainer
          center={coords}
          zoom={11}
          zoomControl={false}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          touchZoom={false}
          keyboard={false}
          attributionControl={false}
          className="h-full w-full"
        >
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" subdomains="abcd" />
          <Marker position={coords} icon={markerIcon} />
          <InvalidateSize />
        </MapContainer>
      </div>
      <p className="mt-2 text-caption tabular-nums text-muted">{formatCoords(lat, lng)}</p>
    </a>
  );
}
