import { Link } from "react-router-dom";
import SpotImage from "./SpotImage";
import { useSpotLive } from "../lib/hooks";
import { sportLabel } from "../lib/labels";
import type { Spot } from "../lib/types";

// Live wind (kt) above which we treat a spot as "running now" (green dot).
const RUNNING_WIND_KT = 12;

/** German-comma wave height, or an honest em-dash when live is missing. */
const fmtWave = (m?: number | null) =>
  typeof m === "number" ? `${m.toFixed(1).replace(".", ",")} m` : "—";

/**
 * Glass-overlay top-spot tile (Frame_1/5). Wind comes from the list record
 * immediately; live wave + the "running" dot come from a per-tile /spots/{id}/live
 * fetch (bounded fan-out, best-effort). Missing live values show "—" / a neutral
 * dot — never an invented constant.
 */
export default function SpotTile({ spot }: { spot: Spot }) {
  const id = spot.uuid ?? spot.id;
  const { data: live } = useSpotLive(id);

  const liveWind = live?.current.wind ?? null;
  const wind = liveWind ?? (spot.wind || null);
  const wave = live?.current.swell ?? null;
  const running = liveWind != null && liveWind >= RUNNING_WIND_KT;
  const tags = (spot.sports ?? []).slice(0, 4).map(sportLabel);

  return (
    <Link
      to={`/spot/${id}`}
      className="group relative block h-[220px] w-full overflow-hidden rounded-3xl"
    >
      <div className="absolute inset-0">
        <SpotImage
          src={spot.image}
          name={spot.name}
          region={spot.region}
          compact
          className="transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

      {/* bottom glass panel */}
      <div className="glass absolute inset-x-0 bottom-0 p-3.5 text-white">
        <p className="truncate text-[10px] font-medium text-white/80">{spot.region}</p>
        <div className="mt-0.5 flex items-start justify-between gap-2">
          <p className="min-w-0 truncate text-[15px] font-semibold">{spot.name}</p>
          <div className="shrink-0 text-right leading-tight">
            <p className="flex items-center justify-end gap-1 text-[13px] font-semibold">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  running ? "bg-dot" : "bg-white/50"
                }`}
              />
              {fmtWave(wave)}
            </p>
            <p className="text-[13px] font-semibold">
              {wind != null ? `${Math.round(wind)} kts` : "—"}
            </p>
          </div>
        </div>
        {tags.length > 0 && (
          <p className="mt-1.5 flex flex-nowrap gap-x-2 overflow-hidden text-[9px] text-white/75">
            {tags.map((t) => (
              <span key={t} className="whitespace-nowrap">{t}</span>
            ))}
          </p>
        )}
      </div>
    </Link>
  );
}
