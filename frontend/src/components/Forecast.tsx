import { useState } from "react";
import type { ForecastDay } from "../lib/types";
import { ChevronDownIcon } from "../lib/icons";
import WindArrow from "./WindArrow";

type WindUnit = "kts" | "ms" | "kmh";
const WIND_ORDER: WindUnit[] = ["kts", "ms", "kmh"];
const WIND_FACTOR: Record<WindUnit, number> = { kts: 1, ms: 0.514444, kmh: 1.852 };
const WIND_LABEL: Record<WindUnit, string> = { kts: "Knoten", ms: "m/s", kmh: "km/h" };
const WIND_SHORT: Record<WindUnit, string> = { kts: "kts", ms: "m/s", kmh: "km/h" };

/** 7-day wind & wave forecast strip. Headless: the section heading lives in
 *  the caller's `SectionBand`. Wind unit cycles Knoten → m/s → km/h; wave
 *  height is always in metres. */
export default function Forecast({ days }: { days: ForecastDay[] }) {
  const [wu, setWu] = useState<WindUnit>("kts");

  const wind = (kts: number) => Math.round(kts * WIND_FACTOR[wu]);
  const windUnit = WIND_SHORT[wu];
  const wave = (m: number) => m.toFixed(1);
  const waveUnit = "m";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setWu((u) => WIND_ORDER[(WIND_ORDER.indexOf(u) + 1) % WIND_ORDER.length])}
          className="inline-flex items-center gap-1.5 text-caption font-medium text-navy transition-colors hover:text-navy/60"
        >
          {WIND_LABEL[wu]}
          <ChevronDownIcon width={14} height={14} className="text-muted" />
        </button>
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

      <div
        aria-hidden="true"
        className="grid min-h-[240px] flex-1 grid-cols-4 gap-2 sm:grid-cols-7"
      >
        {days.map((d) => (
          <div key={d.day} className="flex flex-col items-center justify-between rounded-lg bg-navy/10 px-1 py-4">
            <span className="text-caption font-semibold tracking-wide text-muted">{d.day}</span>

            <div className="flex items-baseline gap-1">
              {/* Shape (filled dot vs. hollow ring) carries the meaning, not just
                  colour — WCAG 1.4.1. */}
              <span
                aria-hidden="true"
                className={`inline-block h-2 w-2 translate-y-[-1px] rounded-full ${
                  d.good ? "bg-dot" : "border border-muted bg-transparent"
                }`}
              />
              {d.good && <span className="sr-only">gute Bedingungen</span>}
              <span className="text-body font-semibold text-navy">{wind(d.wind)}</span>
              <span className="text-caption font-medium text-navy/60">{windUnit}</span>
            </div>

            <WindArrow dir={d.windDir} className="text-navy" />

            <div className="flex flex-col items-center">
              <svg width="18" height="12" viewBox="0 0 24 16" className="text-[#2F6FB0]">
                <path d="M0 10c3 0 3-5 6-5s3 5 6 5 3-5 6-5 3 5 6 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="mt-1 text-caption font-medium text-navy">
                {wave(d.wave)} <span className="text-caption text-muted">{waveUnit}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
