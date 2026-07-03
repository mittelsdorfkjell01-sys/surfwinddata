import { Link } from "react-router-dom";
import type { RegionInfo } from "../data/spots";
import { allRegions, regionMeanWind } from "../data/regionDetail";
import { WindBadge } from "./SpotBits";

/**
 * "Ähnliche Regionen" — reviers that resemble the current one. Placeholder
 * ranking: same country first, then closest mean wind; the real similarity
 * comes from the backend (Sprint 7). A region card = the lead spot's image,
 * country, name, spot count and the region's mean wind.
 */
export default function SimilarRegions({
  region,
  limit = 4,
}: {
  region: RegionInfo;
  limit?: number;
}) {
  const mean = regionMeanWind(region);
  const ranked = allRegions()
    .filter((r) => r.slug !== region.slug)
    .map((r) => ({
      r,
      score: (r.country === region.country ? 0 : 100) + Math.abs(regionMeanWind(r) - mean),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((x) => x.r);

  if (ranked.length === 0) return null;

  return (
    <section>
      <div className="mb-6 border-b border-line/70 pb-4">
        <h2 className="text-[20px] font-semibold text-navy sm:text-[24px]">Ähnliche Regionen</h2>
        <p className="mt-1 text-[14px] text-muted">
          Vergleichbare Reviere nach Charakter und Windstärke
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-9 md:grid-cols-4">
        {ranked.map((r) => (
          <Link key={r.slug} to={`/region/${r.slug}`} className="group block">
            <div className="relative aspect-[16/11] overflow-hidden rounded-2xl bg-line">
              <img
                src={r.spots[0].image}
                alt={r.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-[12px] text-muted">{r.country}</p>
                <WindBadge value={regionMeanWind(r)} />
              </div>
              <h3 className="mt-1 text-lg font-semibold leading-tight text-navy">{r.name}</h3>
              <p className="mt-1 text-[12px] text-muted">
                {r.spots.length} {r.spots.length === 1 ? "Spot" : "Spots"}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
