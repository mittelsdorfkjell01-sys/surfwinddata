import { useState } from "react";
import Header from "../components/Header";
import HeroImage from "../components/HeroImage";
import type { Sport } from "../components/SportToggle";
import SearchBar from "../components/SearchBar";
import SpotCard from "../components/SpotCard";
import ViewToggle from "../components/ViewToggle";
import { SortIcon } from "../lib/icons";
import { topSpots } from "../data/spots";

/** Hero image follows the sport toggle: Wind vs. Welle (wave). */
const HERO: Record<Sport, string> = {
  wind: "/hero-wind.jpg",
  welle: "/hero-welle.jpg",
  wave: "/hero-welle.jpg",
};

export default function Landing() {
  const [sport, setSport] = useState<Sport>("wind");

  return (
    <div className="min-h-screen bg-white">
      <Header sport={sport} onSportChange={setSport} />

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

          <div className="absolute inset-x-0 bottom-12 z-20 px-4 sm:px-6">
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
          <button
            type="button"
            className="flex items-center gap-2 text-[15px] text-navy transition-colors hover:text-navy/60"
          >
            <SortIcon className="text-[18px]" />
            Sortieren
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {topSpots.map((spot) => (
            <SpotCard key={spot.id} spot={spot} />
          ))}
        </div>
      </section>
    </div>
  );
}
