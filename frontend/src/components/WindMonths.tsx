import type { MonthWind } from "../lib/types";

/**
 * Yearly wind climatology. Each month is a cluster of thin weekly bars, so you
 * can read both the seasonal trend and the week-to-week spread at a glance.
 * Bar height maps to mean wind (kts); the tallest week sets the top of scale.
 */
export default function WindMonths({ data }: { data: MonthWind[] }) {
  const max = Math.max(...data.flatMap((m) => m.weeks));

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-navy">Windmonate</h2>
        <span className="text-[12px] text-muted">Ø Wind pro Woche · kts</span>
      </div>

      {/* Screen-reader alternative to the bar chart (WCAG 1.1.1). */}
      <table className="sr-only">
        <caption>Windmonate — durchschnittlicher Wind pro Woche in Knoten</caption>
        <thead>
          <tr>
            <th scope="col">Monat</th>
            <th scope="col">Ø Wind (kts)</th>
          </tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr key={m.month}>
              <td>{m.month}</td>
              <td>{(m.weeks.reduce((a, b) => a + b, 0) / m.weeks.length).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div aria-hidden="true" className="mt-5 flex h-44 items-end gap-2 sm:gap-3">
        {data.map((m) => {
          const monthMean = m.weeks.reduce((a, b) => a + b, 0) / m.weeks.length;
          const strong = monthMean >= max * 0.72;
          return (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end justify-center gap-[2px]">
                {m.weeks.map((w, i) => (
                  <div
                    key={i}
                    className={`w-full max-w-[7px] rounded-t-[3px] transition-colors ${
                      strong ? "bg-navy" : "bg-navy/35"
                    }`}
                    style={{ height: `${Math.max(6, (w / max) * 100)}%` }}
                    title={`${m.month} · W${i + 1}: ${w.toFixed(1)} kts`}
                  />
                ))}
              </div>
              <span className="text-[10.5px] font-medium tracking-wide text-muted">{m.month}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-4 text-[11.5px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2 rounded-sm bg-navy" /> Starke Monate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2 rounded-sm bg-navy/35" /> Ruhigere Monate
        </span>
        <span className="ml-auto hidden sm:block">4 Balken = 4 Wochen</span>
      </div>
    </div>
  );
}
