import { useSpots, useSpotsLive } from "../lib/hooks";
import SpotTile from "./SpotTile";
import { ErrorBanner } from "./AsyncStates";

// One full-width row on desktop; tiles wrap on smaller screens.
const GRID = "grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:px-10 lg:grid-cols-5";
const MAX_TILES = 5;

function RowSkeleton() {
  return (
    <div className={GRID}>
      {Array.from({ length: MAX_TILES }).map((_, i) => (
        <div key={i} className="h-[220px] animate-pulse rounded-3xl bg-white/20" />
      ))}
    </div>
  );
}

/**
 * "aktuelle Top Spots" — a responsive grid of real published spots that fills
 * the row's full width (no horizontal scroll, so no tile is ever clipped). Each
 * tile fetches its own live wave (SpotTile); capped at MAX_TILES so the per-tile
 * live fan-out stays bounded and the desktop row stays a single clean line.
 */
export default function TopSpotsRow() {
  const { data: spots, loading, error, reload } = useSpots({
    status: "published",
    limit: MAX_TILES,
  });
  const top = (spots ?? []).slice(0, MAX_TILES);
  // One batch request for the whole row's live conditions (instead of per tile).
  const { data: liveMap } = useSpotsLive(top.map((s) => s.uuid ?? s.id));

  if (loading) return <RowSkeleton />;
  if (error)
    return (
      <div className="px-4 sm:px-10">
        <ErrorBanner message={error} onRetry={reload} />
      </div>
    );
  if (top.length === 0) return null;

  return (
    <div className={GRID}>
      {top.map((spot, i) => (
        <div
          key={spot.id}
          className="animate-fade-up"
          style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
        >
          <SpotTile spot={spot} live={liveMap?.get(spot.uuid ?? spot.id) ?? null} />
        </div>
      ))}
    </div>
  );
}
