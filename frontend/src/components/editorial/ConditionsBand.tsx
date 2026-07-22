import type { LiveConditionsRead } from "../../lib/api";
import { degToCompass } from "../WindRose";
import WindArrow from "../WindArrow";

/** A live numeric reading. Poppins (loaded from Google Fonts, weight axis
 *  only) has no verified `tnum` table, so `tabular-nums` is kept as a hint
 *  but the real anti-jump guard is the fixed `min-w-[Nch]` passed in via
 *  `className` by each caller. Missing values render as a calm "—" instead
 *  of competing for the same visual weight as real data. */
function Num({ value, className = "" }: { value: string | null; className?: string }) {
  if (value === null) {
    return (
      <span className={`${className} text-line`} title="keine Daten" aria-label="keine Daten">
        —
      </span>
    );
  }
  return <span className={`${className} tabular-nums text-navy`}>{value}</span>;
}

const CLUSTER_LABEL = "text-caption font-medium uppercase tracking-[0.14em] text-navy/55";

/**
 * "Bedingungen jetzt" — the live conditions as a confident editorial band (the
 * bold beat borrowed from the surf-poster direction), grouped into three
 * semantic clusters (Wind / Welle / Temperatur) instead of a flat wall of
 * seven equal stats. Honest "—" per missing value; a quiet inline note when
 * live is entirely unavailable.
 *
 * `variant="card"` adds the floating, hero-overlapping card chrome; `"band"`
 * (default) renders the same content in-flow, with no extra chrome — today's
 * behaviour.
 */
export default function ConditionsBand({
  live,
  variant = "band",
}: {
  live: LiveConditionsRead | null;
  variant?: "band" | "card";
}) {
  const cardChrome =
    "relative z-20 -mt-16 rounded-3xl bg-white/95 shadow-float backdrop-blur-xl sm:-mt-20";

  if (!live) {
    // The floating card variant has nothing to anchor a full panel to when
    // live data is missing — render a compact strip instead of an empty
    // 80px-padded card.
    return (
      <div className={variant === "card" ? `${cardChrome} px-6 py-4 sm:px-10` : ""}>
        <p className="text-body text-muted">Live-Bedingungen momentan nicht verfügbar.</p>
      </div>
    );
  }

  const c = live.current;
  const round = (v: number | null | undefined): string | null =>
    typeof v === "number" ? String(Math.round(v)) : null;
  const fixed = (v: number | null | undefined, d: number): string | null =>
    typeof v === "number" ? v.toFixed(d) : null;

  return (
    <div className={variant === "card" ? `${cardChrome} px-6 py-7 sm:px-10 sm:py-8` : ""}>
      <div className="mb-8 flex items-center gap-2">
        <span className="inline-block h-2 w-2 animate-[pulse_2.4s_ease-in-out_infinite] rounded-full bg-dot" />
        <span className={CLUSTER_LABEL}>Bedingungen jetzt</span>
      </div>

      <div className="grid grid-cols-1 gap-y-8 sm:grid-cols-3 sm:gap-y-0 sm:divide-x sm:divide-line">
        {/* Wind */}
        <div className="sm:px-8 sm:first:pl-0 sm:last:pr-0">
          <div className={CLUSTER_LABEL}>Wind</div>
          <div className="mt-1 flex items-end justify-between gap-4">
            <div className="flex items-baseline gap-1">
              <Num value={round(c.wind)} className="min-w-[2ch] text-stat font-semibold leading-none" />
              <span className="text-body text-muted">kts</span>
            </div>
            {typeof c.dir === "number" ? (
              <div className="flex flex-col items-center gap-1 pb-1">
                <WindArrow dir={c.dir} size={22} className="text-navy" />
                <span className="text-caption font-medium text-navy/70">{degToCompass(c.dir)}</span>
              </div>
            ) : (
              <span className="pb-1 text-line" title="keine Daten" aria-label="keine Daten">
                —
              </span>
            )}
          </div>
          <div className="mt-2 text-caption text-muted">
            Böen <Num value={round(c.gust)} className="font-medium" /> kts
          </div>
        </div>

        {/* Welle */}
        <div className="sm:px-8 sm:first:pl-0 sm:last:pr-0">
          <div className={CLUSTER_LABEL}>Welle</div>
          <div className="mt-1 flex items-baseline gap-1">
            <Num value={fixed(c.swell, 1)} className="min-w-[2.5ch] text-title font-semibold" />
            <span className="text-body text-muted">m</span>
          </div>
          <div className="mt-2 text-caption text-muted">
            <Num value={fixed(c.period, 0)} className="font-medium" /> s Periode
          </div>
        </div>

        {/* Temperatur */}
        <div className="sm:px-8 sm:first:pl-0 sm:last:pr-0">
          <div className={CLUSTER_LABEL}>Temperatur</div>
          <div className="mt-1 space-y-1">
            <div className="flex items-baseline gap-1.5">
              <Num value={round(c.sst)} className="min-w-[2ch] text-title font-semibold" />
              <span className="text-body text-muted">°C</span>
              <span className="text-caption text-muted">Wasser</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <Num value={round(c.air)} className="min-w-[2ch] text-title font-semibold" />
              <span className="text-body text-muted">°C</span>
              <span className="text-caption text-muted">Luft</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
