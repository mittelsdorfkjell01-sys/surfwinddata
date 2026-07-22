import { describe, it, expect } from "vitest";
import { climatologyToMonths, bestSeasonWindow } from "../seasonView";
import type { MonthWind } from "../types";

// Build a 52-week climatology whose rideable-wind hours follow `strongPerWeek`.
// One direction sector; bins are [0-6, 6-10, 10-14, 14-18, 18-25, 25+ kt], so the
// last three (indices 3..5) are the ≥14 kt "rideable" hours the chart sums.
function makeClim(strongPerWeek: (week: number) => number, window = "2006-2025") {
  const weeks = Array.from({ length: 52 }, (_, i) => {
    const w = i + 1;
    const strong = strongPerWeek(w);
    return { week: w, wind: { joint: [[400, 200, 120, strong, strong / 2, 0]] } };
  });
  return { window, weeks };
}

describe("climatologyToMonths — rideable wind hours (≥14 kt)", () => {
  it("returns 12 non-null months from a histogram", () => {
    const months = climatologyToMonths(makeClim(() => 200));
    expect(months).not.toBeNull();
    expect(months).toHaveLength(12);
  });

  it("divides by the number of climatology years (window)", () => {
    // 300 (bin3) + 150 (bin4) + 0 = 450 strong hours/week, over 20 years → 22.5.
    const months = climatologyToMonths(makeClim(() => 300))!;
    const jan = months[0].weeks[0];
    expect(jan).toBeCloseTo(450 / 20, 1);
  });

  it("surfaces the windy season (not flat): winter ≫ summer", () => {
    // Windy Nov–Feb, calm Jun–Aug.
    const months = climatologyToMonths(
      makeClim((w) => (w <= 8 || w >= 44 ? 400 : 40))
    )!;
    const mean = (i: number) =>
      months[i].weeks.reduce((a, b) => a + b, 0) / months[i].weeks.length;
    const winter = mean(0); // JAN
    const summer = mean(6); // JUL
    expect(winter).toBeGreaterThan(summer * 3);
    const means = months.map((_, i) => mean(i));
    const spread = (Math.max(...means) - Math.min(...means)) / Math.max(...means);
    expect(spread).toBeGreaterThan(0.4);
  });

  it("falls back to 20 years when the window can't be parsed", () => {
    const months = climatologyToMonths(makeClim(() => 300, "unknown"))!;
    expect(months[0].weeks[0]).toBeCloseTo(450 / 20, 1);
  });

  it("hides (null) when there is no usable histogram", () => {
    expect(climatologyToMonths(null)).toBeNull();
    expect(climatologyToMonths({ weeks: [] })).toBeNull();
    expect(climatologyToMonths({ weeks: [{ week: 1, wind: {} }] })).toBeNull();
    // All-calm histogram (no ≥14 kt hours) → nothing to show.
    expect(climatologyToMonths(makeClim(() => 0))).toBeNull();
  });
});

// One mean value per month (a single "week" per month keeps the average
// trivial to reason about).
const monthsFrom = (values: number[]): MonthWind[] =>
  values.map((v, i) => ({ month: `M${i}`, weeks: [v] }));

describe("bestSeasonWindow", () => {
  it("finds a clear, non-wrapping summer season", () => {
    const data = monthsFrom([10, 10, 10, 10, 80, 85, 90, 85, 80, 10, 10, 10]);
    const win = bestSeasonWindow(data);
    expect(win).toEqual({
      startIndex: 4,
      endIndex: 8,
      startMonth: "Mai",
      endMonth: "September",
    });
  });

  it("finds a winter season that wraps across the year boundary", () => {
    const data = monthsFrom([90, 88, 85, 10, 10, 10, 10, 10, 10, 10, 80, 92]);
    const win = bestSeasonWindow(data);
    expect(win).toEqual({
      startIndex: 10,
      endIndex: 2,
      startMonth: "November",
      endMonth: "März",
    });
  });

  it("returns null for a flat, seasonless distribution", () => {
    const data = monthsFrom([50, 52, 48, 51, 49, 50, 53, 47, 50, 51, 49, 50]);
    expect(bestSeasonWindow(data)).toBeNull();
  });

  it("spans the full year when every month clears the threshold", () => {
    const data = monthsFrom([100, 90, 85, 80, 75, 70, 75, 80, 85, 90, 95, 98]);
    const win = bestSeasonWindow(data);
    expect(win).toEqual({
      startIndex: 0,
      endIndex: 11,
      startMonth: "Januar",
      endMonth: "Dezember",
    });
  });
});
