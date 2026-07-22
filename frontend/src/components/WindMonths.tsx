import type { MonthWind } from "../lib/types";
import { bestSeasonWindow } from "../lib/seasonView";

const monthMean = (m: MonthWind) => m.weeks.reduce((a, b) => a + b, 0) / m.weeks.length;

/** Highlight rectangles as 1-indexed CSS grid column lines — one, or two
 *  when the window wraps the Dec→Jan boundary (a straight 12-column row
 *  can't draw a single wrapped rectangle). Grid lines (not %-of-width) so
 *  the highlight stays pixel-aligned with the bars regardless of the gap
 *  between them — a plain percentage would drift as the gap ate into the
 *  columns' share of the row. */
function highlightRects(win: { startIndex: number; endIndex: number } | null) {
  if (!win) return [];
  const { startIndex, endIndex } = win;
  if (startIndex <= endIndex) {
    return [{ startCol: startIndex + 1, endCol: endIndex + 2 }];
  }
  return [
    { startCol: startIndex + 1, endCol: 13 },
    { startCol: 1, endCol: endIndex + 2 },
  ];
}

/**
 * Yearly wind climatology — the season section's main module, on navy. Each
 * month is a cluster of thin weekly bars (a single monthly-mean bar under
 * `sm`, where 48 slivers would be unreadable), so you can read both the
 * seasonal trend and the week-to-week spread at a glance. Bar opacity is a
 * continuous function of height (no more strong/calm binary — a month at
 * 71% of peak isn't meaningfully different from one at 72%), and the best
 * contiguous season window is called out both as a highlighted band and as
 * a headline above the chart. Headless: the section heading lives in the
 * caller's `SectionBand`.
 */
export default function WindMonths({ data }: { data: MonthWind[] }) {
  const max = Math.max(...data.flatMap((m) => m.weeks));
  const win = bestSeasonWindow(data);
  const rects = highlightRects(win);
  const opacity = (w: number) => 0.25 + 0.75 * (max > 0 ? w / max : 0);

  return (
    <div>
      {win && (
        <p className="text-title font-semibold text-white">
          Beste Zeit: {win.startMonth} – {win.endMonth}
        </p>
      )}

      <div className={`flex justify-end ${win ? "mt-4" : ""}`}>
        <span className="text-caption text-white/50">Fahrbarer Wind pro Woche · Std ≥ 14 kt</span>
      </div>

      {/* Screen-reader alternative to the bar chart (WCAG 1.1.1). */}
      <table className="sr-only">
        <caption>Windmonate — fahrbare Windstunden pro Woche (≥ 14 kt)</caption>
        <thead>
          <tr>
            <th scope="col">Monat</th>
            <th scope="col">Ø Windstunden/Woche</th>
          </tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr key={m.month}>
              <td>{m.month}</td>
              <td>{monthMean(m).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div aria-hidden="true" className="relative mt-6">
        {/* Highlight overlay — same column template + gap as the bar grid
            below, stacked via absolute positioning, so grid lines line up. */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-12 gap-1 sm:gap-4">
          {rects.map((r, i) => (
            <div
              key={i}
              className="rounded-lg bg-white/[0.07]"
              style={{ gridColumn: `${r.startCol} / ${r.endCol}` }}
            />
          ))}
        </div>

        {/* Mobile: 12 monthly-mean bars — a 48-sliver cluster is unreadable at 375px. */}
        <div className="grid h-[clamp(220px,26vh,320px)] grid-cols-12 items-end gap-1 sm:hidden">
          {data.map((m) => {
            const mean = monthMean(m);
            return (
              <div key={m.month} className="flex h-full flex-col items-center gap-2">
                <div className="flex h-full w-full items-end justify-center">
                  <div
                    className="w-full max-w-[14px] rounded-t-[4px] bg-white"
                    style={{ height: `${Math.max(4, (mean / max) * 100)}%`, opacity: opacity(mean) }}
                    title={`${m.month}: ${mean.toFixed(1)} h ≥14 kt`}
                  />
                </div>
                <span className="text-caption font-medium tracking-wide text-white/60">{m.month}</span>
              </div>
            );
          })}
        </div>

        {/* sm and up: the full weekly-cluster reading. */}
        <div className="hidden h-[clamp(220px,26vh,320px)] grid-cols-12 items-end gap-4 sm:grid">
          {data.map((m) => (
            <div key={m.month} className="flex h-full flex-col items-center gap-2">
              <div className="flex h-full w-full items-end justify-center gap-[2px]">
                {m.weeks.map((w, i) => (
                  <div
                    key={i}
                    className="w-full max-w-[7px] rounded-t-[3px] bg-white"
                    style={{ height: `${Math.max(6, (w / max) * 100)}%`, opacity: opacity(w) }}
                    title={`${m.month} · W${i + 1}: ${w.toFixed(1)} h ≥14 kt`}
                  />
                ))}
              </div>
              <span className="text-caption font-medium tracking-wide text-white/60">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center text-caption text-white/50">
        <span className="hidden sm:block">4 Balken = 4 Wochen</span>
      </div>
    </div>
  );
}
