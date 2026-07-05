import type { Facility, FacilityKind } from "../lib/types";
import {
  InfoIcon,
  ParkingIcon,
  SchoolIcon,
  ShowerIcon,
  FoodIcon,
  CampingIcon,
} from "../lib/icons";

const facilityIcon: Record<FacilityKind, (p: { className?: string }) => JSX.Element> = {
  parking: ParkingIcon,
  school: SchoolIcon,
  shower: ShowerIcon,
  food: FoodIcon,
  camping: CampingIcon,
};

/** "Facilities" panel — icon + title + one-line note per amenity.
 *  Only known facilities are passed in (unknown ones are hidden upstream);
 *  demonstrably-absent ones (available === false) render muted. */
export default function Facilities({ items }: { items: Facility[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-navy">
        <InfoIcon className="text-[18px] text-navy/70" />
        <h2 className="text-[15px] font-semibold">Facilities</h2>
      </div>

      <ul className="space-y-4">
        {items.map((f) => {
          const Icon = facilityIcon[f.kind];
          const absent = f.available === false;
          return (
            <li key={f.kind} className={`flex items-start gap-3 ${absent ? "opacity-50" : ""}`}>
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center text-navy">
                <Icon className="text-[21px]" />
              </span>
              <div className="min-w-0">
                <p
                  className={`text-[14px] font-medium leading-tight text-navy ${
                    absent ? "line-through decoration-navy/40" : ""
                  }`}
                >
                  {f.title}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{f.note}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
