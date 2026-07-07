// "Wann?" panel (Frame_3): a two-month calendar (date range) OR a month chip,
// plus quick-range chips. Range and month modes reset each other.

import { useState } from "react";
import type { SVGProps } from "react";
import type { WhenValue } from "../../lib/searchSubmit";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEC"];
const MONTHS_LONG = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const chev = {
  width: "1em",
  height: "1em",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
const ChevL = (p: SVGProps<SVGSVGElement>) => (
  <svg {...chev} {...p}><path d="m15 6-6 6 6 6" /></svg>
);
const ChevR = (p: SVGProps<SVGSVGElement>) => (
  <svg {...chev} {...p}><path d="m9 6 6 6-6 6" /></svg>
);

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Mon-first grid of the month; leading blanks as null. */
function monthCells(year: number, month: number): (Date | null)[] {
  const startDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: startDow }, () => null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  return cells;
}

const addMonth = (a: { y: number; m: number }, delta: number) => {
  const total = a.y * 12 + a.m + delta;
  return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
};

export default function SearchWhen({
  value,
  onChange,
}: {
  value: WhenValue;
  onChange: (next: WhenValue) => void;
}) {
  const today = new Date();
  const [anchor, setAnchor] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const range = value?.mode === "range" ? value : null;
  const selMonth = value?.mode === "month" ? value.month : null;

  const clickDay = (d: Date) => {
    const iso = toISO(d);
    if (!range || range.to || !range.from) {
      onChange({ mode: "range", from: iso });
      return;
    }
    onChange(
      iso < range.from
        ? { mode: "range", from: iso, to: range.from }
        : { mode: "range", from: range.from, to: iso }
    );
  };

  const pickMonth = (m1: number) =>
    onChange(selMonth === m1 ? null : { mode: "month", month: m1 });

  const quick = (days: number) => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + days);
    onChange({ mode: "range", from: toISO(from), to: toISO(to) });
  };

  const inRange = (d: Date) => {
    if (!range?.from) return false;
    const iso = toISO(d);
    if (!range.to) return iso === range.from;
    return iso >= range.from && iso <= range.to;
  };
  const isEdge = (d: Date) => {
    if (!range?.from) return false;
    const iso = toISO(d);
    return iso === range.from || iso === range.to;
  };

  const months = [anchor, addMonth(anchor, 1)];

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <div className="flex flex-1 gap-8">
        {months.map((mm, idx) => (
          <div key={idx} className="flex-1">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setAnchor(addMonth(anchor, -1))}
                aria-label="Vorheriger Monat"
                className={`grid h-7 w-7 place-items-center rounded-full text-navy transition-colors hover:bg-cream ${idx === 0 ? "" : "invisible"}`}
              >
                <ChevL className="text-[16px]" />
              </button>
              <span className="text-[14px] font-semibold text-navy">
                {MONTHS_LONG[mm.m]} {mm.y}
              </span>
              <button
                type="button"
                onClick={() => setAnchor(addMonth(anchor, 1))}
                aria-label="Nächster Monat"
                className={`grid h-7 w-7 place-items-center rounded-full text-navy transition-colors hover:bg-cream ${idx === months.length - 1 ? "" : "invisible"}`}
              >
                <ChevR className="text-[16px]" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {WEEKDAYS.map((w) => (
                <span key={w} className="pb-1 text-center text-[11px] font-medium text-muted">
                  {w}
                </span>
              ))}
              {monthCells(mm.y, mm.m).map((d, i) =>
                d ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => clickDay(d)}
                    className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-[12px] transition-colors ${
                      isEdge(d)
                        ? "bg-brand-orange text-white"
                        : inRange(d)
                        ? "bg-brand-orange/15 text-navy"
                        : "text-navy hover:bg-cream"
                    }`}
                  >
                    {d.getDate()}
                  </button>
                ) : (
                  <span key={i} />
                )
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="lg:w-[220px]">
        <div className="grid grid-cols-4 gap-2">
          {MONTHS_SHORT.map((mon, i) => (
            <button
              key={mon}
              type="button"
              onClick={() => pickMonth(i + 1)}
              className={`rounded-lg border px-2 py-2 text-[12px] font-medium transition-colors ${
                selMonth === i + 1
                  ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                  : "border-line text-brand-teal hover:border-brand-teal"
              }`}
            >
              {mon}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {([["Ein Wochenende", 2], ["Eine Woche", 7], ["zwei Wochen", 14]] as const).map(
            ([label, days]) => (
              <button
                key={label}
                type="button"
                onClick={() => quick(days)}
                className="rounded-full border border-line px-3 py-1.5 text-[12px] text-brand-teal transition-colors hover:border-brand-teal"
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
