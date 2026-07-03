import SpotCard from "./SpotCard";
import { allSpots, type Spot } from "../data/spots";

/**
 * "Ähnliche Spots" — spots that resemble the current one. Placeholder ranking:
 * same region first, then closest wind strength; the real similarity ranking
 * comes from the backend (Sprint 7). Reuses the landing SpotCard for a
 * consistent look.
 */
export default function SimilarSpots({ spot, limit = 4 }: { spot: Spot; limit?: number }) {
  const others = allSpots.filter((s) => s.id !== spot.id);
  const sameRegion = spot.region.split(",")[0].trim();

  const ranked = others
    .map((s) => ({
      s,
      score:
        (s.region.split(",")[0].trim() === sameRegion ? 0 : 100) +
        Math.abs(s.wind - spot.wind),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((x) => x.s);

  if (ranked.length === 0) return null;

  return (
    <section>
      <div className="mb-6 border-b border-line/70 pb-4">
        <h2 className="text-[20px] font-semibold text-navy sm:text-[24px]">Ähnliche Spots</h2>
        <p className="mt-1 text-[14px] text-muted">
          Vergleichbare Reviere nach Charakter und Windstärke
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-9 md:grid-cols-4">
        {ranked.map((s) => (
          <SpotCard key={s.id} spot={s} />
        ))}
      </div>
    </section>
  );
}
