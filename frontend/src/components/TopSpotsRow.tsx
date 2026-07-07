import { useSpots } from "../lib/hooks";
import SpotTile from "./SpotTile";
import { ErrorBanner } from "./AsyncStates";

function RowSkeleton() {
  return (
    <div className="flex gap-4 px-4 sm:px-10">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-[300px] w-[220px] shrink-0 animate-pulse rounded-3xl bg-white/20"
        />
      ))}
    </div>
  );
}

/**
 * "aktuelle Top Spots" — a horizontal, snap-scrolling row of real published
 * spots (Frame_1/5 tiles were placeholders). Each tile fetches its own live
 * wave (SpotTile). Limited to the first ~10 so the per-tile live fan-out stays
 * bounded.
 */
export default function TopSpotsRow() {
  const { data: spots, loading, error } = useSpots({ status: "published" });
  const top = (spots ?? []).slice(0, 10);

  if (loading) return <RowSkeleton />;
  if (error) return <div className="px-4 sm:px-10"><ErrorBanner message={error} /></div>;
  if (top.length === 0) return null;

  return (
    <div className="snap-x-mandatory flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:px-10">
      {top.map((spot, i) => (
        <div
          key={spot.id}
          className="animate-fade-up snap-start"
          style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
        >
          <SpotTile spot={spot} />
        </div>
      ))}
    </div>
  );
}
