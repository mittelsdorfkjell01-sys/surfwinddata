import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import LandingHeader from "../components/LandingHeader";
import HeroImage from "../components/HeroImage";
import type { Sport } from "../components/SportToggle";
import SearchBar from "../components/SearchBar";
import SpotCard from "../components/SpotCard";
import SortDropdown from "../components/SortDropdown";
import ViewToggle from "../components/ViewToggle";
import { ErrorBanner, EmptyState, SpotGridSkeleton } from "../components/AsyncStates";
import { useSpots } from "../lib/hooks";
import {
  filtersToQuery,
  filtersToSearchParams,
  parseFilters,
  sortSpots,
  type FilterState,
} from "../lib/filters";

/** Hero image follows the sport toggle: Wind vs. Welle (wave). */
const HERO: Record<Sport, string> = {
  wind: "/hero-wind.jpg",
  welle: "/hero-welle.jpg",
  wave: "/hero-welle.jpg",
};

export default function Landing() {
  // Static hero for now; the sport toggle moved into the search "Welche?" step.
  const [sport] = useState<Sport>("wind");
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseFilters(searchParams);
  const setFilters = (next: FilterState) =>
    setSearchParams(filtersToSearchParams(next), { replace: true });

  const { data: spots, loading, error } = useSpots({
    status: "published",
    ...filtersToQuery(filters),
  });
  const sorted = spots ? sortSpots(spots, filters.sort) : null;

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />

      {/* Hero — the search card sits fully on the image, per the mock */}
      <section className="relative">
        <div className="relative h-[70vh] min-h-[520px] w-full overflow-hidden bg-navy-soft">
          <HeroImage
            key={sport}
            src={HERO[sport]}
            alt=""
            className="h-full w-full animate-[fade_400ms_ease-out] object-cover motion-reduce:animate-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10" />

          {/* z above the search scrim (z-1100, portalled to body) so the bar
              stays crisp while the rest of the page dims. */}
          <div className="absolute inset-x-0 bottom-12 z-[1200] px-4 sm:px-6">
            <div className="mx-auto max-w-[960px]">
              <SearchBar />
            </div>
          </div>
        </div>
      </section>

      {/* Top spots */}
      <section className="mx-auto max-w-[1400px] px-4 pb-24 pt-16 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight text-navy sm:text-[34px]">
              Top Spots ausgewählt für die aktuelle Saison
            </h1>
            <p className="mt-2 text-[15px] text-muted">
              Nach Eignung für Wellensport ausgewählt
            </p>
          </div>
          <ViewToggle active="grid" />
        </div>

        <div className="mt-10 flex items-center justify-between border-b border-line/70 pb-4">
          <h2 className="text-[15px] font-medium text-navy">aktuelle Topspots</h2>
          <SortDropdown value={filters} onChange={setFilters} />
        </div>

        <div className="mt-8">
          {loading && <SpotGridSkeleton />}
          {error && !loading && <ErrorBanner message={error} />}
          {!loading && !error && sorted && sorted.length === 0 && (
            <EmptyState message="Keine Spots für diese Auswahl." />
          )}
          {!loading && !error && sorted && sorted.length > 0 && (
            <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {sorted.map((spot) => (
                <SpotCard key={spot.id} spot={spot} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
