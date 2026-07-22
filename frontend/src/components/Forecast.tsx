import { useId, useState } from "react";
import type { ForecastDay } from "../lib/types";
import WindArrow from "./WindArrow";

type WindUnit = "kts" | "ms" | "kmh";
const WIND_ORDER: WindUnit[] = ["kts", "ms", "kmh"];
const WIND_FACTOR: Record<WindUnit, number> = { kts: 1, ms: 0.514444, kmh: 1.852 };
const WIND_SHORT: Record<WindUnit, string> = { kts: "kts", ms: "m/s", kmh: "km/h" };

const CHART_W = 700;
const CHART_H = 160;
const PAD_TOP = 16;
const PAD_BOTTOM = 8;

type Pt = { x: number; y: number };

/** Catmull-Rom → cubic Bézier, clamped at the ends (no phantom overshoot past
 *  the first/last point). Standard 1/6 tension keeps the curve close to a
 *  straight interpolation between real values — smooth, not inventive. */
function smoothPath(points: Pt[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** 7-day wind & wave forecast: a continuous curve (the shape of the week)
 *  above a day-by-day strip (the numbers). Headless: the section heading
 *  lives in the caller's `SectionBand`. Wind unit switches Knoten/m/s/km/h;
 *  wave height is always in metres. */
export default function Forecast({ days }: { days: ForecastDay[] }) {
  const [wu, setWu] = useState<WindUnit>("kts");
  const gradientId = useId();

  const wind = (kts: number) => Math.round(kts * WIND_FACTOR[wu]);
  const windUnit = WIND_SHORT[wu];
  const wave = (m: number) => m.toFixed(1);
  const waveUnit = "m";

  const colW = CHART_W / days.length;
  const windValues = days.map((d) => wind(d.wind));
  const vMin = Math.min(...windValues);
  const vMax = Math.max(...windValues);
  const span = vMax - vMin || 1;
  const y = (v: number) => PAD_TOP + (1 - (v - vMin) / span) * (CHART_H - PAD_TOP - PAD_BOTTOM);
  const points = windValues.map((v, i) => ({ x: colW * i + colW / 2, y: y(v) }));
  const linePath = smoothPath(points);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${CHART_H} L ${points[0].x} ${CHART_H} Z`
      : "";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-full bg-navy/5 p-1">
          {WIND_ORDER.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setWu(u)}
              aria-pressed={u === wu}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-3 text-label font-medium transition-colors ${
                u === wu ? "bg-white text-navy shadow-pill" : "text-muted hover:text-navy"
              }`}
            >
              {WIND_SHORT[u]}
            </button>
          ))}
        </div>
      </div>

      {/* Screen-reader alternative to the forecast strip (WCAG 1.1.1). */}
      <table className="sr-only">
        <caption>Wind- und Wellenvorhersage für 7 Tage</caption>
        <thead>
          <tr>
            <th scope="col">Tag</th>
            <th scope="col">Wind ({windUnit})</th>
            <th scope="col">Welle (m)</th>
            <th scope="col">Bedingungen</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{wind(d.wind)}</td>
              <td>{wave(d.wave)}</td>
              <td>{d.good ? "gut" : "mäßig"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div aria-hidden="true">
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} width="100%" className="block overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#13335E" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#13335E" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Good-day bands sit behind the curve, aligned to each day's column. */}
          {days.map(
            (d, i) =>
              d.good && (
                <rect
                  key={d.day}
                  x={colW * i}
                  y={0}
                  width={colW}
                  height={CHART_H}
                  className="fill-brand-green/[0.06]"
                />
              )
          )}

          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
          <path
            d={linePath}
            fill="none"
            stroke="#13335E"
            strokeWidth={2}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {points.map((p, i) => (
            <g key={days[i].day}>
              {days[i].good && (
                <circle cx={p.x} cy={p.y} r={8} fill="none" className="stroke-brand-green" strokeWidth={1.5} />
              )}
              <circle cx={p.x} cy={p.y} r={4} className="fill-navy" />
            </g>
          ))}
        </svg>
      </div>

      <div className="overflow-x-auto no-scrollbar snap-x-mandatory">
        <div aria-hidden="true" className="mt-2 grid grid-flow-col auto-cols-[minmax(76px,1fr)]">
          {days.map((d) => (
            <div key={d.day} className="flex snap-start flex-col items-center gap-1.5 px-2 py-3">
              <span className="text-caption font-semibold tracking-wide text-muted">{d.day}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-body font-semibold tabular-nums text-navy">{wind(d.wind)}</span>
                <span className="text-caption font-medium text-navy/60">{windUnit}</span>
              </div>
              <WindArrow dir={d.windDir} size={20} className="text-navy" />
              <span className="text-caption font-medium text-muted">
                {wave(d.wave)} {waveUnit}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
