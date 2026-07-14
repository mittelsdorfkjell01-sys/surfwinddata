import type { LiveConditionsRead } from "../../lib/api";
import { degToCompass } from "../WindRose";

/** One reading: small label above, large value + unit below. */
function Stat({
  label,
  value,
  unit,
  big,
}: {
  label: string;
  value: string;
  unit?: string;
  big?: boolean;
}) {
  return (
    <div>
      <div className="text-caption text-muted">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={`${big ? "text-display-2" : "text-[26px]"} font-semibold leading-none text-navy`}
        >
          {value}
        </span>
        {unit && <span className="text-[14px] font-medium text-muted">{unit}</span>}
      </div>
    </div>
  );
}

/**
 * "Bedingungen jetzt" — the live conditions as a confident editorial band (the
 * bold beat borrowed from the surf-poster direction). Honest "—" per missing
 * value; a quiet inline note when live is entirely unavailable.
 */
export default function ConditionsBand({ live }: { live: LiveConditionsRead | null }) {
  if (!live) {
    return (
      <p className="text-[15px] text-muted">Live-Bedingungen momentan nicht verfügbar.</p>
    );
  }
  const c = live.current;
  const round = (v: number | null | undefined) =>
    typeof v === "number" ? String(Math.round(v)) : "—";
  const fixed = (v: number | null | undefined, d: number) =>
    typeof v === "number" ? v.toFixed(d) : "—";

  return (
    <div>
      <div className="mb-7 flex items-center gap-2">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-dot" />
        <span className="text-caption font-medium uppercase tracking-[0.14em] text-navy/55">
          Bedingungen jetzt
        </span>
      </div>
      <div className="flex flex-wrap items-end gap-x-12 gap-y-8">
        <Stat label="Wind" value={round(c.wind)} unit="kts" big />
        <Stat label="Böen" value={round(c.gust)} unit="kts" />
        <Stat label="Welle" value={fixed(c.swell, 1)} unit="m" />
        <Stat label="Periode" value={fixed(c.period, 0)} unit="s" />
        <Stat label="Wasser" value={round(c.sst)} unit="°C" />
        <Stat label="Luft" value={round(c.air)} unit="°C" />
        <Stat
          label="Richtung"
          value={typeof c.dir === "number" ? degToCompass(c.dir) : "—"}
          unit={typeof c.dir === "number" ? `${Math.round(c.dir)}°` : undefined}
        />
      </div>
    </div>
  );
}
