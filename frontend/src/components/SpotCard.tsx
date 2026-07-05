import { Link } from "react-router-dom";
import type { Spot } from "../lib/types";
import { WindBadge } from "./SpotBits";
import SpotImage from "./SpotImage";

/** Landing-grid card: image, region + name, wind reading.
 *  Category axes (level/water/style) are intentionally NOT shown here — they are
 *  filter/sort data (see SortDropdown), not visible pills. */
export default function SpotCard({ spot }: { spot: Spot }) {
  return (
    <Link to={`/spot/${spot.id}`} className="group block">
      <div className="relative aspect-[16/11] overflow-hidden rounded-2xl bg-line">
        <SpotImage
          src={spot.image}
          name={spot.name}
          region={spot.region}
          className="transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-[12px] text-muted">{spot.region}</p>
          <WindBadge value={spot.wind} />
        </div>
        <h3 className="mt-1 text-lg font-semibold leading-tight text-navy">{spot.name}</h3>
      </div>
    </Link>
  );
}
