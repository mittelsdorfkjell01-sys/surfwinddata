// Admin regions (Sprint B): list with per-status spot counts, create a region,
// edit the model_pref default, and fetch a credited stock image.

import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ApiError,
  createRegion,
  getAdminRegions,
  setRegionStockImage,
  type AdminRegionEntry,
} from "../lib/api";

export default function AdminRegions() {
  const [entries, setEntries] = useState<AdminRegionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await getAdminRegions());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Laden fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const onStockImage = async (id: string, name: string) => {
    setBusyId(id);
    setError(null);
    try {
      await setRegionStockImage(id);
      flash(`Stock-Bild für „${name}" gesetzt.`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Bild-Abruf fehlgeschlagen.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="text-[24px] font-semibold text-navy">Regionen</h1>
      <p className="mt-1 text-[14px] text-muted">
        Regionen anlegen, bearbeiten und ein Stock-Bild abrufen. Das Wettermodell
        wird automatisch nach den Koordinaten gewählt.
      </p>

      {notice && (
        <div className="mt-4 rounded-xl bg-brand-green/10 px-3 py-2 text-[13px] font-medium text-brand-green">
          {notice}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[13px] font-medium text-red-700"
        >
          {error}
        </div>
      )}

      <CreateRegionForm
        onCreated={async (name) => {
          flash(`Region „${name}" angelegt.`);
          await load();
        }}
        onError={setError}
      />

      <div className="mt-8 space-y-3">
        {loading ? (
          <div className="text-[14px] text-muted">Lädt…</div>
        ) : entries.length === 0 ? (
          <div className="text-[14px] text-muted">Noch keine Regionen.</div>
        ) : (
          entries.map((entry) => (
            <RegionCard
              key={entry.region.id}
              entry={entry}
              busy={busyId === entry.region.id}
              onStockImage={() => onStockImage(entry.region.id, entry.region.name)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function RegionCard({
  entry,
  busy,
  onStockImage,
}: {
  entry: AdminRegionEntry;
  busy: boolean;
  onStockImage: () => void;
}) {
  const { region, spot_counts } = entry;

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[16px] font-semibold text-navy">
            {region.name}
            {region.country && (
              <span className="ml-2 text-[13px] font-normal text-muted">
                {region.country}
              </span>
            )}
          </div>
          <div className="mt-1 flex gap-3 text-[12px] text-muted">
            <span>{spot_counts.published} live</span>
            <span>{spot_counts.draft} Entwurf</span>
            <span>{spot_counts.archived} archiviert</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {region.image?.url ? (
            <span className="text-[12px] text-brand-green">● Bild gesetzt</span>
          ) : (
            <span className="text-[12px] text-muted">○ Kein Bild</span>
          )}
          <Link
            to={`/admin/region/${region.id}/edit`}
            className="rounded-lg bg-navy px-2.5 py-1 text-[13px] font-medium text-white hover:bg-navy-dark"
          >
            Bearbeiten
          </Link>
          <a
            href={`/region/${region.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-line px-2.5 py-1 text-[13px] font-medium text-navy hover:bg-navy/5"
          >
            Ansehen ↗
          </a>
          <button
            type="button"
            disabled={busy}
            onClick={onStockImage}
            className="rounded-lg border border-line px-2.5 py-1 text-[13px] font-medium text-navy hover:bg-navy/5 disabled:opacity-50"
          >
            Stock-Bild
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateRegionForm({
  onCreated,
  onError,
}: {
  onCreated: (name: string) => void | Promise<void>;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);

  const inputCls =
    "w-full rounded-xl border border-navy/15 bg-white px-3 py-2 text-[14px] text-navy outline-none focus:border-navy/40";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // No coordinates: the backend geocodes the name → centre + bounds.
      await createRegion({
        name: name.trim(),
        country: country.trim() || undefined,
      });
      setName("");
      setCountry("");
      await onCreated(name.trim());
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Anlegen fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 rounded-2xl bg-navy/5 p-4 sm:p-5" noValidate>
      <p className="text-[14px] font-semibold text-navy">Neue Region anlegen</p>
      <p className="mt-1 text-[12px] text-muted">
        Nur Name (+ Land) — Mittelpunkt und Fläche werden automatisch aus dem
        Namen bestimmt.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          className={`${inputCls} min-w-[220px] flex-1`}
          placeholder="Name (z. B. Sardinien)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className={`${inputCls} w-40`}
          placeholder="Land (z. B. IT)"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="shrink-0 rounded-xl bg-navy px-5 py-2 text-[13px] font-medium text-white hover:bg-navy-dark disabled:opacity-50"
        >
          {busy ? "Suche…" : "Anlegen"}
        </button>
      </div>
    </form>
  );
}
