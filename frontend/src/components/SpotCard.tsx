import { Link } from "react-router-dom";
import type { Spot } from "../data/spots";
import { TagPill, WindBadge } from "./SpotBits";

/** Landing-grid card: image, region + name, wind reading, tag row. */
export default function SpotCard({ spot }: { spot: Spot }) {
  return (
    <Link to={`/spot/${spot.id}`} className="group block">
      <div className="relative aspect-[16/11] overflow-hidden rounded-2xl bg-line">
        <img
          src={spot.image}
          alt={spot.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-[12px] text-muted">{spot.region}</p>
          <WindBadge value={spot.wind} />
        </div>
        <h3 className="mt-1 text-lg font-semibold leading-tight text-navy">{spot.name}</h3>

        {spot.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {spot.tags.map((t) => (
              <TagPill key={t.label} tag={t} />
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
