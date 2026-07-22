import type { Facility, FacilityKind } from "../lib/types";
import { ParkingIcon, SchoolIcon, ShowerIcon, FoodIcon, CampingIcon } from "../lib/icons";

const facilityIcon: Record<FacilityKind, (p: { width?: number; height?: number }) => JSX.Element> = {
  parking: ParkingIcon,
  school: SchoolIcon,
  shower: ShowerIcon,
  food: FoodIcon,
  camping: CampingIcon,
};

/** "Facilities" panel — icon + title + one-line note per amenity. Headless:
 *  the section heading lives in the caller's `SectionBand`. Only known
 *  facilities are passed in (unknown ones are hidden upstream);
 *  demonstrably-absent ones (available === false) render muted. */
export default function Facilities({ items }: { items: Facility[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-4">
      {items.map((f) => {
        const Icon = facilityIcon[f.kind];
        const absent = f.available === false;
        return (
          <li key={f.kind} className={`flex items-start gap-3 ${absent ? "opacity-50" : ""}`}>
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center text-navy">
              <Icon width={21} height={21} />
            </span>
            <div className="min-w-0">
              <p
                className={`text-ui font-medium leading-tight text-navy ${
                  absent ? "line-through decoration-navy/40" : ""
                }`}
              >
                {f.title}
              </p>
              <p className="mt-0.5 text-caption leading-snug text-muted">{f.note}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
