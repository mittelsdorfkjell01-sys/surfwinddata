import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import { ErrorBanner, EmptyState } from "../components/AsyncStates";
import * as api from "../lib/api";
import { sportLabel } from "../lib/labels";

/** A skeleton list of result rows. */
function ResultSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-line" />
      ))}
    </div>
  );
}

/**
 * Search results. With a query it calls GET /search (entity/geocode resolution);
 * with no query it answers the "open place / open time" case — the best regions
 * for the season (travel default) via GET /search/best-regions.
 */
export default function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const sport = params.get("sport") ?? undefined;
  const week = params.get("week");

  const [result, setResult] = useState<api.SearchResult | null>(null);
  const [bestRegions, setBestRegions] = useState<api.BestRegionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setResult(null);
    setBestRegions(null);

    const run = q.trim()
      ? api
          .getSearch({
            q: q.trim(),
            sport,
            week: week ? Number(week) : undefined,
          })
          .then((r) => alive && setResult(r))
      : api.getBestRegions({ sport }).then((r) => alive && setBestRegions(r));

    run
      .catch(
        (e) =>
          alive &&
          setError(e instanceof api.ApiError ? e.message : "Suche fehlgeschlagen.")
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [q, sport, week]);

  const heading = q.trim()
    ? `Suche: „${q.trim()}“`
    : "Beste Reviere für die Saison";

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-[1000px] px-4 pb-24 pt-12 sm:px-8">
        <nav className="mb-4 text-[13px] font-medium text-navy/70">
          <Link to="/" className="hover:underline">
            Übersicht
          </Link>
          <span className="mx-1.5 text-muted">›</span>
          <span className="text-navy">Suche</span>
        </nav>

        <h1 className="text-[26px] font-semibold text-navy">{heading}</h1>
        {sport && (
          <p className="mt-1 text-[14px] text-muted">
            Sportart: {sportLabel(sport)}
            {week ? ` · KW ${week}` : ""}
          </p>
        )}

        <div className="mt-8">
          {loading && <ResultSkeleton />}
          {error && !loading && <ErrorBanner message={error} />}

          {!loading && !error && result && (
            <SearchHits result={result} />
          )}

          {!loading && !error && bestRegions && (
            <BestRegionsList data={bestRegions} />
          )}
        </div>
      </main>
    </div>
  );
}

function SearchHits({ result }: { result: api.SearchResult }) {
  const empty = result.regionen.length === 0 && result.spots.length === 0;
  if (empty) {
    return (
      <EmptyState message="Keine Treffer. Versuche einen anderen Ort oder Spot-Namen." />
    );
  }
  return (
    <div className="space-y-10">
      {result.regionen.length > 0 && (
        <section>
          <h2 className="mb-3 text-[15px] font-semibold text-navy">Regionen</h2>
          <ul className="space-y-2">
            {result.regionen.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/region/${r.slug}`}
                  className="flex items-center justify-between rounded-xl bg-[#F1F5FA] px-4 py-3 hover:bg-navy/[0.06]"
                >
                  <span className="font-medium text-navy">{r.name}</span>
                  <span className="text-[13px] text-muted">Region ›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.spots.length > 0 && (
        <section>
          <h2 className="mb-3 text-[15px] font-semibold text-navy">Spots</h2>
          <ul className="space-y-2">
            {result.spots.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/spot/${s.id}`}
                  className="flex items-center justify-between gap-4 rounded-xl bg-[#F1F5FA] px-4 py-3 hover:bg-navy/[0.06]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-navy">{s.name}</span>
                    <span className="block truncate text-[12px] text-muted">
                      {s.sports.map(sportLabel).join(", ")}
                    </span>
                  </span>
                  {typeof s.score === "number" && (
                    <span className="shrink-0 text-[12px] text-muted">
                      Score {Math.round(s.score * 100)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function BestRegionsList({ data }: { data: api.BestRegionsResponse }) {
  const ranking = data.regions ?? [];
  if (ranking.length === 0) {
    return (
      <EmptyState message="Noch keine Saison-Daten (Klimatologie fehlt für die veröffentlichten Spots)." />
    );
  }
  return (
    <section>
      <p className="mb-3 text-[14px] text-muted">
        Offene Achse: wohin, wenn Ort und Zeit offen sind — Reviere nach Abdeckung
        über die Saison.
      </p>
      <ul className="space-y-2">
        {ranking.map((r, i) => (
          <li key={r.id ?? r.slug ?? i}>
            <Link
              to={r.slug ? `/region/${r.slug}` : "#"}
              className="flex items-center justify-between rounded-xl bg-[#F1F5FA] px-4 py-3 hover:bg-navy/[0.06]"
            >
              <span className="font-medium text-navy">
                {i + 1}. {r.name ?? r.slug}
              </span>
              {typeof r.coverage === "number" && (
                <span className="text-[13px] text-muted">
                  {Math.round(r.coverage * 100)}% Abdeckung
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
