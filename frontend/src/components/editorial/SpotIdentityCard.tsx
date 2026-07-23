import { Link } from "react-router-dom";
import type { LiveConditionsRead } from "../../lib/api";
import { degToCompass } from "../WindRose";
import WindArrow from "../WindArrow";
import { formatCoords, mapLinkProps } from "../../lib/mapLinks";

/**
 * The page's single <h1> (spot name) plus breadcrumb, coordinates, and the
 * current live wind — floating over the hero's bottom edge (replaces the old
 * `ConditionsBand variant="card"` at this position). Live-wind is omitted
 * entirely (not shown as an empty row) when `live` has no reading.
 */
export default function SpotIdentityCard({
  name,
  regionName,
  country,
  regionHref,
  coords,
  live,
}: {
  name: string;
  regionName?: string;
  country?: string;
  regionHref: string;
  coords?: [number, number];
  live: LiveConditionsRead | null;
}) {
  const wind = live?.current.wind;
  const dir = live?.current.dir;

  return (
    <div className="relative z-20 -mt-16 max-w-[1180px] rounded-3xl bg-white/95 px-6 py-7 shadow-float backdrop-blur-xl sm:-mt-20 sm:px-10 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          {(country || regionName) && (
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-label text-navy/50">
              {country && <span>{country}</span>}
              {country && regionName && <span aria-hidden="true">›</span>}
              {regionName && (
                <Link to={regionHref} className="hover:text-navy hover:underline">
                  {regionName}
                </Link>
              )}
            </nav>
          )}

          <h1 className="mt-1 text-display-2 font-semibold text-balance text-navy">{name}</h1>

          {coords && (
            <a
              {...mapLinkProps(coords[0], coords[1])}
              className="mt-2 inline-block text-caption tabular-nums text-muted transition-colors hover:text-navy hover:underline"
            >
              {formatCoords(coords[0], coords[1])}
            </a>
          )}
        </div>

        {typeof wind === "number" && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-block h-2 w-2 shrink-0 animate-[pulse_2.4s_ease-in-out_infinite] rounded-full bg-dot" />
            <span className="flex items-baseline gap-1">
              <span className="text-stat font-semibold leading-none tabular-nums text-navy">
                {Math.round(wind)}
              </span>
              <span className="text-body text-muted">kts</span>
            </span>
            {typeof dir === "number" && (
              <span className="flex flex-col items-center gap-1 pb-1">
                <WindArrow dir={dir} size={22} className="text-navy" />
                <span className="text-caption font-medium text-navy/70">{degToCompass(dir)}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
