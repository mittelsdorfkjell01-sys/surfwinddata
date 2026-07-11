// Moderation panel (Sprint D): tabs for spot submissions, hero-image candidates,
// reported images, and flagged tips/ratings. Each item shows context + actions,
// and the list refreshes after a decision.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { resolveMediaUrl } from "../lib/api";
import {
  ApiError,
  approveImage,
  approveSubmission,
  dismissReports,
  getReviewQueue,
  hideRating,
  hideTip,
  rejectImage,
  rejectSubmission,
  removeImage,
  type ReviewQueue,
} from "../lib/api";

type Tab = "submissions" | "hero" | "reported" | "content";

const TABS: { key: Tab; label: string; count: (q: ReviewQueue) => number }[] = [
  { key: "submissions", label: "Spot-Einreichungen", count: (q) => q.counts.submissions_pending },
  { key: "hero", label: "Hero-Bilder", count: (q) => q.counts.hero_candidates_pending },
  { key: "reported", label: "Gemeldete Bilder", count: (q) => q.counts.reported_images },
  {
    key: "content",
    label: "Tips & Bewertungen",
    count: (q) => q.tips.length + q.ratings.length,
  },
];

export default function AdminReview() {
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [tab, setTab] = useState<Tab>("submissions");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setQueue(await getReviewQueue());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Laden fehlgeschlagen.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-[24px] font-semibold text-navy">Review</h1>
      <p className="mt-1 text-[14px] text-muted">
        Nutzer-Beiträge sichten und entscheiden. Jede Aktion wird protokolliert.
      </p>

      {error && (
        <div role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-5 flex flex-wrap gap-2 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-[14px] font-medium ${
              tab === t.key
                ? "border-navy text-navy"
                : "border-transparent text-muted hover:text-navy"
            }`}
          >
            {t.label}
            {queue && t.count(queue) > 0 && (
              <span className="ml-2 rounded-full bg-brand-orange/15 px-2 py-0.5 text-[11px] font-semibold text-brand-orange">
                {t.count(queue)}
              </span>
            )}
          </button>
        ))}
      </div>

      {!queue ? (
        <div className="mt-6 text-[14px] text-muted">Lädt…</div>
      ) : (
        <div className="mt-6 space-y-3">
          {tab === "submissions" &&
            (queue.submissions.length === 0 ? (
              <Empty>Keine offenen Einreichungen.</Empty>
            ) : (
              queue.submissions.map((s) => (
                <Card key={s.id}>
                  <div className="min-w-0">
                    <div className="font-semibold text-navy">{s.name ?? "—"}</div>
                    <div className="text-[13px] text-muted">
                      von {s.submitter_name} · {new Date(s.created_at).toLocaleDateString("de-DE")}
                    </div>
                    <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-cream p-2 text-[12px] text-navy/80">
                      {JSON.stringify(s.payload, null, 2)}
                    </pre>
                  </div>
                  <Actions>
                    <Approve busy={busy} onClick={() => act(() => approveSubmission(s.id))}>
                      Als Entwurf anlegen
                    </Approve>
                    <Reject busy={busy} onClick={() => act(() => rejectSubmission(s.id, promptNote()))}>
                      Ablehnen
                    </Reject>
                  </Actions>
                </Card>
              ))
            ))}

          {tab === "hero" &&
            (queue.hero_candidates.length === 0 ? (
              <Empty>Keine Hero-Kandidaten.</Empty>
            ) : (
              queue.hero_candidates.map((i) => (
                <Card key={i.id}>
                  <ImagePreview url={i.url} credit={i.credit} spotId={i.spot_id} />
                  <Actions>
                    <Approve busy={busy} onClick={() => act(() => approveImage(i.id))}>
                      Als Hero freigeben
                    </Approve>
                    <Reject busy={busy} onClick={() => act(() => rejectImage(i.id, promptNote()))}>
                      Ablehnen
                    </Reject>
                  </Actions>
                </Card>
              ))
            ))}

          {tab === "reported" &&
            (queue.reported_images.length === 0 ? (
              <Empty>Keine gemeldeten Bilder.</Empty>
            ) : (
              queue.reported_images.map((i) => (
                <Card key={i.id}>
                  <ImagePreview
                    url={i.url}
                    credit={i.credit}
                    spotId={i.spot_id}
                    badge={`${i.report_count} Meldung(en)`}
                  />
                  <Actions>
                    <Reject busy={busy} onClick={() => act(() => removeImage(i.id, promptNote()))}>
                      Entfernen
                    </Reject>
                    <Neutral busy={busy} onClick={() => act(() => dismissReports(i.id))}>
                      Meldungen verwerfen
                    </Neutral>
                  </Actions>
                </Card>
              ))
            ))}

          {tab === "content" &&
            (queue.tips.length === 0 && queue.ratings.length === 0 ? (
              <Empty>Keine Tips oder Bewertungen.</Empty>
            ) : (
              <>
                <p className="text-[13px] text-muted">
                  Alle veröffentlichten Beiträge (gemeldete zuerst). „Verbergen"
                  nimmt einen Beitrag aus der öffentlichen Liste — reversibel.
                </p>
                {queue.ratings.map((r) => (
                  <Card key={r.id}>
                    <div className="min-w-0">
                      <div className="text-[13px] text-muted">
                        Bewertung · {r.stars}★ · {r.author_name}
                        {r.flagged && (
                          <span className="ml-2 rounded-full bg-brand-orange/15 px-2 py-0.5 text-[11px] font-semibold text-brand-orange">
                            gemeldet
                          </span>
                        )}
                      </div>
                      <p className="text-[14px] text-navy">{r.conditions}</p>
                    </div>
                    <Actions>
                      <Reject busy={busy} onClick={() => act(() => hideRating(r.id))}>
                        Verbergen
                      </Reject>
                    </Actions>
                  </Card>
                ))}
                {queue.tips.map((t) => (
                  <Card key={t.id}>
                    <div className="min-w-0">
                      <div className="text-[13px] text-muted">
                        Tipp · {t.author_name}
                        {t.flagged && (
                          <span className="ml-2 rounded-full bg-brand-orange/15 px-2 py-0.5 text-[11px] font-semibold text-brand-orange">
                            gemeldet
                          </span>
                        )}
                      </div>
                      <p className="text-[14px] text-navy">{t.body}</p>
                    </div>
                    <Actions>
                      <Reject busy={busy} onClick={() => act(() => hideTip(t.id))}>
                        Verbergen
                      </Reject>
                    </Actions>
                  </Card>
                ))}
              </>
            ))}
        </div>
      )}
    </div>
  );
}

function promptNote(): string | undefined {
  return window.prompt("Notiz (optional):") ?? undefined;
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-line bg-white p-4">
      {children}
    </div>
  );
}
function Actions({ children }: { children: React.ReactNode }) {
  return <div className="flex shrink-0 flex-wrap gap-2">{children}</div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-line bg-white p-6 text-center text-[14px] text-muted">{children}</div>;
}
function Approve({ busy, onClick, children }: { busy: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" disabled={busy} onClick={onClick} className="rounded-lg bg-brand-green px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50">
      {children}
    </button>
  );
}
function Reject({ busy, onClick, children }: { busy: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" disabled={busy} onClick={onClick} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[13px] font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
      {children}
    </button>
  );
}
function Neutral({ busy, onClick, children }: { busy: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" disabled={busy} onClick={onClick} className="rounded-lg border border-line px-3 py-1.5 text-[13px] font-medium text-navy hover:bg-navy/5 disabled:opacity-50">
      {children}
    </button>
  );
}
function ImagePreview({
  url,
  credit,
  spotId,
  badge,
}: {
  url: string;
  credit: string | null;
  spotId: string;
  badge?: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <img
        src={resolveMediaUrl(url)}
        alt=""
        className="h-20 w-32 shrink-0 rounded-lg object-cover"
      />
      <div className="min-w-0 text-[13px]">
        {credit && <div className="text-navy">Credit: {credit}</div>}
        {badge && <div className="font-medium text-brand-orange">{badge}</div>}
        <Link to={`/admin/spot/${spotId}/edit`} className="text-muted hover:underline">
          Zum Spot
        </Link>
      </div>
    </div>
  );
}
