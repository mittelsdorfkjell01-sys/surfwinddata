import { describe, expect, it } from "vitest";
import type { Spot } from "../../lib/types";
import { facilitiesFromMap, spotFactsFrom } from "../spotView";

const baseSpot = (over: Partial<Spot>): Spot => ({
  id: "x",
  name: "X",
  region: "",
  wind: 0,
  tags: [],
  image: "",
  ...over,
});

describe("facilitiesFromMap", () => {
  it("hides unknown facilities (absent keys)", () => {
    const out = facilitiesFromMap({ parking: { available: true } });
    expect(out.map((f) => f.kind)).toEqual(["parking"]);
  });

  it("includes available:false but flags it", () => {
    const out = facilitiesFromMap({ shower: { available: false } });
    expect(out[0]).toMatchObject({ kind: "shower", available: false, note: "Nicht vorhanden" });
  });

  it("keeps notes and canonical order", () => {
    const out = facilitiesFromMap({
      camping: { available: true, note: "am Platz" },
      parking: { available: true },
    });
    expect(out.map((f) => f.kind)).toEqual(["parking", "camping"]); // canonical order
    expect(out.find((f) => f.kind === "camping")?.note).toBe("am Platz");
  });

  it("returns [] for null/empty", () => {
    expect(facilitiesFromMap(null)).toEqual([]);
    expect(facilitiesFromMap({})).toEqual([]);
  });
});

describe("spotFactsFrom", () => {
  it("only includes axes that are present", () => {
    const facts = spotFactsFrom(baseSpot({ level: "advanced", sports: ["kitesurf"] }));
    const labels = facts.map((f) => f.label);
    expect(labels).toContain("Level");
    expect(labels).toContain("Sportarten");
    expect(labels).not.toContain("Wasserart");
    expect(labels).not.toContain("Fahrstil");
  });

  it("renders German labels and a comma-joined style list", () => {
    const facts = spotFactsFrom(
      baseSpot({ level: "pro", waterCharacter: "welle_gross", style: ["freeride", "wave_riding"] })
    );
    expect(facts.find((f) => f.label === "Level")?.value).toBe("Profi");
    expect(facts.find((f) => f.label === "Wasserart")?.value).toBe("Große Welle");
    expect(facts.find((f) => f.label === "Fahrstil")?.value).toBe("Freeride, Wellenreiten");
  });
});
