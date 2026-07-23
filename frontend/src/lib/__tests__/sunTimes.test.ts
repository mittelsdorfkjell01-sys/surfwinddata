import { describe, it, expect } from "vitest";
import { sunTimes } from "../sunTimes";

// Tarifa, Spain — a real spot in this catalogue.
const TARIFA: [number, number] = [36.0, -5.6];

describe("sunTimes", () => {
  it("returns a sunrise strictly before sunset for a mid-latitude summer day", () => {
    const r = sunTimes(TARIFA[0], TARIFA[1], new Date(Date.UTC(2026, 6, 15)))!;
    expect(r).not.toBeNull();
    expect(r.sunrise).toBeGreaterThan(0);
    expect(r.sunrise).toBeLessThan(12);
    expect(r.sunset).toBeGreaterThan(12);
    expect(r.sunset).toBeLessThan(24);
    expect(r.sunrise).toBeLessThan(r.sunset);
  });

  it("gives a longer day in June than in December at mid-latitude (N hemisphere)", () => {
    const summer = sunTimes(TARIFA[0], TARIFA[1], new Date(Date.UTC(2026, 5, 21)))!;
    const winter = sunTimes(TARIFA[0], TARIFA[1], new Date(Date.UTC(2026, 11, 21)))!;
    const dayLength = (r: { sunrise: number; sunset: number }) => r.sunset - r.sunrise;
    expect(dayLength(summer)).toBeGreaterThan(dayLength(winter));
  });

  it("returns null for polar night (high latitude, winter)", () => {
    expect(sunTimes(78, 15, new Date(Date.UTC(2026, 11, 21)))).toBeNull();
  });

  it("returns null for the midnight sun (high latitude, summer)", () => {
    expect(sunTimes(78, 15, new Date(Date.UTC(2026, 5, 21)))).toBeNull();
  });
});
