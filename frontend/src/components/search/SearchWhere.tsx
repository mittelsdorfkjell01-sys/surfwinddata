// "Wohin?" panel (Frame_4): Spots + Regionen grids (flag + name) and a
// "Zuletzt gesucht" column from localStorage. Selecting fills the search value.

import { useMemo } from "react";
import { useRegions, useSpots } from "../../lib/hooks";
import { countryFlag } from "../../lib/flags";
import { getRecent, type RecentItem } from "../../lib/recentSearches";
import type { WhereSelection } from "../../lib/searchSubmit";

export interface WherePick extends WhereSelection {
  country?: string | null;
}

function Row({
  flag,
  label,
  onClick,
}: {
  flag: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-cream"
    >
      <span className="text-[16px] leading-none">{flag}</span>
      <span className="truncate text-[15px] text-brand-teal">{label}</span>
    </button>
  );
}

export default function SearchWhere({
  query,
  onPick,
}: {
  query: string;
  onPick: (pick: WherePick) => void;
}) {
  const { data: spots } = useSpots({ status: "published" });
  const { data: regions } = useRegions();
  // Snapshot recents once per mount so the list doesn't reshuffle mid-interaction.
  const recent = useMemo<RecentItem[]>(() => getRecent(), []);

  const regionById = useMemo(
    () => new Map((regions ?? []).map((r) => [r.id, r])),
    [regions]
  );

  const q = query.trim().toLowerCase();
  const spotHits = (spots ?? [])
    .filter((s) => !q || s.name.toLowerCase().includes(q))
    .slice(0, 8);
  const regionHits = (regions ?? [])
    .filter((r) => !q || r.name.toLowerCase().includes(q))
    .slice(0, 6);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_1px_260px]">
      <div>
        <h3 className="mb-3 text-[13px] font-medium text-muted">Spots</h3>
        {spotHits.length ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {spotHits.map((s) => {
              const country = regionById.get(s.regionId ?? "")?.country ?? null;
              return (
                <Row
                  key={s.id}
                  flag={countryFlag(country)}
                  label={s.name}
                  onClick={() =>
                    onPick({ label: s.name, kind: "spot", id: s.uuid ?? s.id, country })
                  }
                />
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-muted">Keine Spots gefunden.</p>
        )}

        <h3 className="mb-3 mt-6 text-[13px] font-medium text-muted">Regionen</h3>
        {regionHits.length ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {regionHits.map((r) => (
              <Row
                key={r.id}
                flag={countryFlag(r.country)}
                label={r.name}
                onClick={() =>
                  onPick({ label: r.name, kind: "region", id: r.id, country: r.country })
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted">Keine Regionen gefunden.</p>
        )}
      </div>

      <div className="hidden bg-line md:block" />

      <div>
        <h3 className="mb-3 text-[13px] font-medium text-muted">Zuletzt gesucht</h3>
        {recent.length ? (
          <div className="flex flex-col gap-1">
            {recent.map((r, i) => (
              <Row
                key={`${r.label}-${i}`}
                flag={countryFlag(r.country)}
                label={r.label}
                onClick={() =>
                  onPick({
                    label: r.label,
                    kind: r.kind === "region" ? "region" : "spot",
                    id: r.id,
                    country: r.country,
                  })
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted">Noch nichts gesucht.</p>
        )}
      </div>
    </div>
  );
}
