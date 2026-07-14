import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import LandingHeader from "../components/LandingHeader";
import SpotCard from "../components/SpotCard";
import MapSpotCard from "../components/MapSpotCard";
import RegionSeason from "../components/RegionSeason";
import SimilarRegions from "../components/SimilarRegions";
import SortDropdown from "../components/SortDropdown";
import Footer from "../components/Footer";
import { EmptyState, ErrorBanner, SpotGridSkeleton } from "../components/AsyncStates";
import type { RegionInfo } from "../lib/types";
import { useRegions, useSpots, useRegionSeason, useBestWeeks } from "../lib/hooks";
import { regionSeasonToView } from "../lib/seasonView";
import {
  filterSpots,
  filtersToSearchParams,
  parseFilters,
  sortSpots,
  type FilterState,
} from "../lib/filters";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseFilters(searchParams);
  const setFilters = (next: FilterState) =>
    setSearchParams(filtersToSearchParams(next), { replace: true });

  const {
    data: regions,
    loading: regionsLoading,
    error: regionsError,
    reload: reloadRegions,
  } = useRegions();
  const backendRegion = useMemo(
    () => regions?.find((r) => r.slug === slug),
    [regions, slug]
  );
  const {
    data: spots,
    loading: spotsLoading,
    error: spotsError,
    reload: reloadSpots,
  } = useSpots(
    backendRegion ? { region_id: backendRegion.id, status: "published" } : {}
  );
  const { data: seasonRaw } = useRegionSeason(backendRegion?.id);
  const { data: bestWeeksRaw } = useBestWeeks(backendRegion?.id);

  const loading = regionsLoading || (backendRegion && spotsLoading);
  const error = regionsError || spotsError;

  const region: RegionInfo | undefined = useMemo(() => {
    if (!backendRegion) return undefined;
    const rSpots = spots ?? [];
    const withCoords = rSpots.filter((s) => s.coords);
    const center: [number, number] = backendRegion.center
      ? [backendRegion.center.lat, backendRegion.center.lon]
      : withCoords.length
      ? [
          withCoords.reduce((a, s) => a + s.coords![0], 0) / withCoords.length,
          withCoords.reduce((a, s) => a + s.coords![1], 0) / withCoords.length,
        ]
      : [46, 8];
    return {
      slug: backendRegion.slug,
      name: backendRegion.name,
      country: backendRegion.country ?? "",
      spots: rSpots,
      center,
    };
  }, [backendRegion, spots]);

  if (loading) {
    return (
      <div className="relative min-h-screen bg-white">
        <LandingHeader />
        <div className="mx-auto max-w-[1400px] px-4 pt-32 sm:px-8">
          <div className="mb-10 h-8 w-64 animate-pulse rounded bg-line" />
          <SpotGridSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen bg-white">
        <LandingHeader />
        <div className="mx-auto max-w-[1400px] px-4 pt-32 sm:px-8">
          <ErrorBanner
            message={error}
            onRetry={() => {
              reloadRegions();
              reloadSpots();
            }}
          />
        </div>
      </div>
    );
  }

  if (!region || !backendRegion) {
    return (
      <div className="relative min-h-screen bg-white">
        <LandingHeader />
        <div className="grid min-h-screen place-items-center px-6 text-center">
          <div>
            <h1 className="text-2xl font-semibold text-navy">Region nicht gefunden</h1>
            <Link to="/" className="mt-4 inline-block text-[15px] text-brand-teal underline">
              Zurück zur Übersicht
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const description = backendRegion.description ?? "";
  const seasonView = seasonRaw
    ? regionSeasonToView(seasonRaw, region.spots.length)
    : null;
  const bestWeeks = (bestWeeksRaw?.weeks ?? []).slice(0, 8);
  const heroImage = region.spots[0]?.image;
  const withCoords = region.spots.filter((s) => s.coords);
  const gridSpots = sortSpots(filterSpots(region.spots, filters), filters.sort);

  return (
    <div className="relative min-h-screen bg-white">
      <LandingHeader />

      <main>
      {/* Hero */}
      <section className="relative">
        <div className="relative h-[68vh] min-h-[560px] w-full overflow-hidden bg-navy-soft">
          {heroImage ? (
            <img src={heroImage} alt={region.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-navy-soft" />
          )}
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
          <span className="text-brand-teal">{region.name}</span>
        </nav>

        {/* Über die Region + beste Monate (daneben) */}
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-[15px] font-semibold text-navy">Über die Region</h2>
            <p className="text-[15px] leading-relaxed text-navy/75">
              {description || (
                <span className="text-muted">Noch keine Beschreibung hinterlegt.</span>
              )}
            </p>

            {/* Offene Zeit: beste Wochen (falls Klimatologie vorliegt) */}
            {bestWeeks.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">
                  Beste Wochen
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {bestWeeks.map((w) => (
                    <span
                      key={w.week}
                      className="inline-flex items-center rounded-full bg-brand-teal/10 px-2.5 py-1 text-[12px] font-medium text-brand-teal"
                      title={`Score ${Math.round((w.score ?? 0) * 100)} · ${w.spots_working ?? 0} Spots`}
                    >
                      KW {w.week}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {seasonView ? (
            <RegionSeason season={seasonView.season} bestMonths={seasonView.bestMonths} />
          ) : (
            <div className="rounded-3xl bg-cream px-5 py-10 text-center text-[13px] text-muted">
              Noch keine Saison-Daten für diese Region (Klimatologie fehlt).
            </div>
          )}
        </div>

        {/* Spots in der Region — direkt darunter */}
        <div className="mt-14">
          <div className="flex items-center justify-between border-b border-line/70 pb-4">
            <h2 className="text-[15px] font-medium text-navy">Spots in {region.name}</h2>
            <SortDropdown value={filters} onChange={setFilters} />
          </div>
          {gridSpots.length === 0 ? (
            <div className="mt-6">
              <EmptyState message="Keine Spots für diese Auswahl." />
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {gridSpots.map((spot) => (
                <SpotCard key={spot.id} spot={spot} />
              ))}
            </div>
          )}
        </div>

        {/* Übersichtskarte */}
        {withCoords.length > 0 && (
          <div className="mt-14">
            <h2 className="mb-5 text-[15px] font-semibold text-navy">Spots auf der Karte</h2>
            <div className="overflow-hidden rounded-3xl shadow-card">
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
      </main>

      <Footer />
    </div>
  );
}
