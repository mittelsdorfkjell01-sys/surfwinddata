import { Link, useParams } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import Header from "../components/Header";
import SpotCard from "../components/SpotCard";
import MapSpotCard from "../components/MapSpotCard";
import RegionSeason from "../components/RegionSeason";
import SimilarRegions from "../components/SimilarRegions";
import { getRegion } from "../data/spots";
import { getRegionDetail } from "../data/regionDetail";

/** Navy teardrop pin — same look as the main map view. */
const pinIcon = L.divIcon({
  className: "swd-pin",
  html: `<svg width="30" height="38" viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.7 0 1 4.7 1 10.7 1 18.4 12 30 12 30s11-11.6 11-19.3C23 4.7 18.3 0 12 0Z"
        fill="#13335E" stroke="#ffffff" stroke-width="1.4"/>
      <circle cx="12" cy="10.5" r="3.4" fill="#ffffff"/>
    </svg>`,
  iconSize: [30, 38],
  iconAnchor: [15, 38],
  popupAnchor: [0, -34],
});

export default function RegionDetail() {
  const { slug } = useParams();
  const region = getRegion(slug);

  if (!region) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="grid min-h-screen place-items-center px-6 text-center">
          <div>
            <h1 className="text-2xl font-semibold text-navy">Region nicht gefunden</h1>
            <Link to="/" className="mt-4 inline-block text-[15px] text-navy underline">
              Zurück zur Übersicht
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const detail = getRegionDetail(region);
  const withCoords = region.spots.filter((s) => s.coords);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="relative">
        <div className="relative h-[68vh] min-h-[560px] w-full overflow-hidden bg-navy-soft">
          <img src={region.spots[0].image} alt={region.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/20" />
          <div className="absolute inset-x-0 bottom-0">
            <div className="mx-auto max-w-[1400px] px-4 pb-8 sm:px-8">
              <p className="text-[13px] font-medium text-white/90">{region.country}</p>
              <h1 className="mt-1 text-[34px] font-semibold leading-tight text-white drop-shadow sm:text-[44px]">
                {region.name}
              </h1>
              <p className="mt-1 text-[15px] text-white/90">
                {region.spots.length} {region.spots.length === 1 ? "Spot" : "Spots"} in der Region
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Body — same width as the other pages */}
      <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-16 sm:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-[13px] font-medium text-navy/70">
          <Link to="/" className="hover:underline">Übersicht</Link>
          {region.country && <span className="mx-1.5 text-muted">›</span>}
          {region.country && <span>{region.country}</span>}
          <span className="mx-1.5 text-muted">›</span>
          <span className="text-navy">{region.name}</span>
        </nav>

        {/* Über die Region + beste Monate (daneben) */}
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-[15px] font-semibold text-navy">Über die Region</h2>
            <p className="text-[15px] leading-relaxed text-navy/75">{detail.description}</p>
          </div>
          <RegionSeason season={detail.season} bestMonths={detail.bestMonths} />
        </div>

        {/* Spots in der Region — direkt darunter */}
        <div className="mt-14">
          <h2 className="text-[15px] font-medium text-navy">Spots in {region.name}</h2>
          <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {region.spots.map((spot) => (
              <SpotCard key={spot.id} spot={spot} />
            ))}
          </div>
        </div>

        {/* Übersichtskarte */}
        {withCoords.length > 0 && (
          <div className="mt-14">
            <h2 className="mb-5 text-[15px] font-semibold text-navy">Spots auf der Karte</h2>
            <div className="overflow-hidden rounded-2xl shadow-card">
              <MapContainer
                center={region.center}
                zoom={7}
                zoomControl={false}
                scrollWheelZoom
                className="h-[300px] w-full sm:h-[380px]"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  subdomains="abcd"
                />
                {withCoords.map((spot) => (
                  <Marker key={spot.id} position={spot.coords!} icon={pinIcon}>
                    <Popup className="spot-popup" closeButton={false}>
                      <MapSpotCard spot={spot} className="w-[200px]" />
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        )}

        {/* Ähnliche Regionen */}
        <div className="mt-20">
          <SimilarRegions region={region} />
        </div>
      </div>
    </div>
  );
}
