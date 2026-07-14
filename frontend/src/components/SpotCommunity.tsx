// Public community section on the spot page: ratings, local tips and a photo
// gallery. Content is shown first; the input forms are collapsed behind a button
// ("Bewerten" / "Kommentar verfassen" / "+") so the page stays calm and reading-
// first. Names are required (first name, or first + last).

import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  getImageLicense,
  getRatings,
  getSpotImages,
  getTips,
  postRating,
  postTip,
  reportImage,
  resolveMediaUrl,
  uploadSpotImage,
  type CommunityImage,
  type RatingAggregate,
  type RatingItem,
  type TipItem,
} from "../lib/api";
import { HERO_REQ, validateHeroFile } from "./ImageUpload";
import { LEVELS, levelLabel, sportLabel } from "../lib/labels";

const SPORTS = ["kitesurf", "windsurf", "wing", "surf"];
const REPORT_REASONS: { key: string; label: string }[] = [
  { key: "copyright", label: "Urheberrecht / mein Bild" },
  { key: "inappropriate", label: "Unangemessen" },
  { key: "wrong_spot", label: "Falscher Spot" },
  { key: "other", label: "Sonstiges" },
];

const card = "rounded-2xl border border-line bg-white p-5";
const input =
  "w-full rounded-xl border border-navy/15 bg-white px-3 py-2 text-[14px] text-navy outline-none focus:border-navy/40";
const primaryBtn =
  "rounded-xl bg-navy px-4 py-2 text-[14px] font-medium text-white hover:bg-navy-dark disabled:opacity-50";
const ghostBtn =
  "rounded-xl border border-navy/20 bg-white px-4 py-2 text-[14px] font-medium text-navy hover:bg-navy/5";

// Name must be a first name, or first + last (1–2 words, letters only).
const NAME_RE = /^\p{L}[\p{L}'.-]*(?:\s+\p{L}[\p{L}'.-]*)?$/u;
const validName = (n: string) => NAME_RE.test(n.trim());

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span aria-label={`${value} von 5 Sternen`} style={{ fontSize: size }}>
      <span className="text-brand-orange">{"★".repeat(full)}</span>
      <span className="text-line">{"★".repeat(5 - full)}</span>
    </span>
  );
}

export default function SpotCommunity({ spotId }: { spotId: string }) {
  return (
    <section aria-labelledby="community-heading">
      <h2 id="community-heading" className="text-[20px] font-semibold text-navy">
        Community
      </h2>
      <p className="mt-1 text-[14px] text-muted">
        Erfahrungen, Tipps und Bilder von anderen vor Ort. Bitte fair und sachlich bleiben.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Ratings spotId={spotId} />
        <Tips spotId={spotId} />
      </div>
      <div className="mt-6">
        <Gallery spotId={spotId} />
      </div>
    </section>
  );
}

// --- ratings ---------------------------------------------------------------

function Ratings({ spotId }: { spotId: string }) {
  const [items, setItems] = useState<RatingItem[]>([]);
  const [agg, setAgg] = useState<RatingAggregate | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    getRatings(spotId)
      .then((r) => {
        setItems(r.items);
        setAgg(r.aggregate);
      })
      .catch(() => setError("Bewertungen konnten nicht geladen werden."));

  useEffect(() => {
    void load();
  }, [spotId]);

  return (
    <div className={card}>
      {/* Aggregate header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-semibold text-navy">Bewertungen</h3>
          {agg && agg.count > 0 ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[22px] font-semibold text-navy">
                {agg.avg?.toFixed(1)}
              </span>
              <Stars value={agg.avg ?? 0} size={18} />
              <span className="text-[13px] text-muted">({agg.count})</span>
            </div>
          ) : (
            <p className="mt-1 text-[13px] text-muted">Noch keine Bewertungen.</p>
          )}
        </div>
        {!open && (
          <button type="button" className={ghostBtn} onClick={() => setOpen(true)}>
            Bewerten
          </button>
        )}
      </div>

      {error && <p role="alert" className="mt-2 text-[13px] text-red-600">{error}</p>}

      {/* Form opens only on demand */}
      {open && (
        <RatingForm
          spotId={spotId}
          onCancel={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            load();
          }}
        />
      )}

      {/* Ratings below */}
      {items.length > 0 && (
        <ul className="mt-4 space-y-3 border-t border-line pt-4">
          {items.map((r) => (
            <li key={r.id} className="rounded-xl bg-cream p-3">
              <div className="flex items-center justify-between">
                <Stars value={r.stars} />
                <span className="text-[12px] text-muted">
                  {sportLabel(r.sport)} · {levelLabel(r.skill_level)}
                </span>
              </div>
              <p className="mt-1 text-[14px] text-navy/90">{r.conditions}</p>
              <p className="mt-1 text-[12px] text-muted">— {r.author_name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RatingForm({
  spotId,
  onDone,
  onCancel,
}: {
  spotId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [stars, setStars] = useState(0);
  const [skill, setSkill] = useState("intermediate");
  const [sport, setSport] = useState("kitesurf");
  const [conditions, setConditions] = useState("");
  const [author, setAuthor] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (stars < 1) return setError("Bitte eine Sternebewertung wählen.");
    if (!validName(author)) return setError("Bitte Vorname (oder Vor- und Nachname) angeben.");
    setError(null);
    setBusy(true);
    try {
      await postRating(spotId, {
        stars, skill_level: skill, sport, conditions,
        author_name: author.trim(), website,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl bg-navy/5 p-4">
      <p className="text-[13px] font-medium text-navy">Deine Bewertung</p>
      {/* clickable stars */}
      <div className="mt-2 flex gap-1 text-[26px] leading-none">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} Sterne`}
            onClick={() => setStars(n)}
            className={n <= stars ? "text-brand-orange" : "text-line hover:text-brand-orange/50"}
          >
            ★
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="text-[13px] text-muted">
          Level
          <select value={skill} onChange={(e) => setSkill(e.target.value)} className={`mt-1 ${input}`}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{levelLabel(l)}</option>
            ))}
          </select>
        </label>
        <label className="text-[13px] text-muted">
          Sportart
          <select value={sport} onChange={(e) => setSport(e.target.value)} className={`mt-1 ${input}`}>
            {SPORTS.map((s) => (
              <option key={s} value={s}>{sportLabel(s)}</option>
            ))}
          </select>
        </label>
      </div>
      <textarea
        required
        value={conditions}
        onChange={(e) => setConditions(e.target.value)}
        placeholder="Welche Bedingungen bist du gefahren? (Pflichtfeld)"
        className={`mt-2 ${input}`}
        rows={2}
      />
      <input
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Vorname oder Vor- und Nachname (Pflichtfeld)"
        className={`mt-2 ${input}`}
        required
      />
      <Honeypot value={website} onChange={setWebsite} />
      {error && <p role="alert" className="mt-2 text-[13px] text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={busy || !conditions.trim()} className={primaryBtn}>
          {busy ? "Senden…" : "Bewertung abgeben"}
        </button>
        <button type="button" onClick={onCancel} className={ghostBtn}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}

// --- tips ------------------------------------------------------------------

function Tips({ spotId }: { spotId: string }) {
  const [items, setItems] = useState<TipItem[]>([]);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => getTips(spotId).then((r) => setItems(r.items)).catch(() => {});

  useEffect(() => {
    void load();
  }, [spotId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validName(author)) return setError("Bitte Vorname (oder Vor- und Nachname) angeben.");
    setError(null);
    setBusy(true);
    try {
      await postTip(spotId, { body, author_name: author.trim(), website });
      setBody("");
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-semibold text-navy">Local Tips</h3>
        {!open && (
          <button type="button" className={ghostBtn} onClick={() => setOpen(true)}>
            Kommentar verfassen
          </button>
        )}
      </div>

      <ul className="mt-3 space-y-2">
        {items.length === 0 ? (
          <li className="text-[13px] text-muted">Noch keine Tipps.</li>
        ) : (
          items.map((t) => (
            <li key={t.id} className="rounded-xl bg-cream p-3">
              <p className="text-[14px] text-navy/90">{t.body}</p>
              <p className="mt-1 text-[12px] text-muted">— {t.author_name}</p>
            </li>
          ))
        )}
      </ul>

      {open && (
        <form onSubmit={submit} className="mt-4 rounded-xl bg-navy/5 p-4">
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Dein Tipp für diesen Spot"
            className={input}
            rows={2}
          />
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Vorname oder Vor- und Nachname (Pflichtfeld)"
            className={`mt-2 ${input}`}
            required
          />
          <Honeypot value={website} onChange={setWebsite} />
          {error && <p role="alert" className="mt-2 text-[13px] text-red-600">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={busy || !body.trim()} className={primaryBtn}>
              {busy ? "Senden…" : "Tipp teilen"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={ghostBtn}>
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// --- gallery + upload + report ---------------------------------------------

function Gallery({ spotId }: { spotId: string }) {
  const [items, setItems] = useState<CommunityImage[]>([]);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = () =>
    getSpotImages(spotId).then((r) => setItems(r.items)).catch(() => {});

  useEffect(() => {
    void load();
  }, [spotId]);

  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-semibold text-navy">Bildergalerie</h3>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-8 w-8 place-items-center rounded-full bg-navy text-[20px] leading-none text-white hover:bg-navy-dark"
            aria-label="Bild hinzufügen"
            title="Bild hinzufügen"
          >
            +
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">Noch keine Bilder.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((img) => (
            <figure key={img.id} className="group relative overflow-hidden rounded-xl">
              <img
                src={resolveMediaUrl(img.url)}
                alt={img.credit ?? ""}
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
              {img.credit && (
                <figcaption className="absolute inset-x-0 bottom-0 bg-navy/60 px-2 py-1 text-[11px] text-white">
                  {img.credit}
                </figcaption>
              )}
              <button
                type="button"
                onClick={() => setReportFor(img.id)}
                className="absolute right-1.5 top-1.5 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-medium text-navy opacity-0 transition-opacity group-hover:opacity-100"
              >
                Melden
              </button>
            </figure>
          ))}
        </div>
      )}

      {reportFor && (
        <ReportDialog
          imageId={reportFor}
          onClose={() => setReportFor(null)}
          onDone={() => setReportFor(null)}
        />
      )}

      {open && <UploadForm spotId={spotId} onCancel={() => setOpen(false)} onDone={load} />}
    </div>
  );
}

function ReportDialog({
  imageId,
  onClose,
  onDone,
}: {
  imageId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("copyright");
  const [note, setNote] = useState("");
  const [contact, setContact] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await reportImage(imageId, { reason, note: note || undefined });
      setContact(res.takedown_contact);
      setTimeout(onDone, 1600);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Meldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-line bg-cream p-4">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-medium text-navy">Bild melden</p>
        <button type="button" onClick={onClose} className="text-[13px] text-muted hover:text-navy">
          Schließen
        </button>
      </div>
      {contact !== null ? (
        <p role="status" className="mt-2 text-[13px] text-brand-green">
          Danke, deine Meldung ist eingegangen.
          {contact && <> Bei dringenden Rechtefragen: {contact}</>}
        </p>
      ) : (
        <>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={`mt-2 ${input}`}>
            {REPORT_REASONS.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anmerkung (optional)"
            className={`mt-2 ${input}`}
            rows={2}
          />
          {error && <p role="alert" className="mt-2 text-[13px] text-red-600">{error}</p>}
          <button type="button" disabled={busy} onClick={submit} className={`mt-3 ${primaryBtn}`}>
            {busy ? "Senden…" : "Melden"}
          </button>
        </>
      )}
    </div>
  );
}

function UploadForm({
  spotId,
  onDone,
  onCancel,
}: {
  spotId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<"gallery" | "hero_candidate">("gallery");
  const [file, setFile] = useState<File | null>(null);
  const [credit, setCredit] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [website, setWebsite] = useState("");
  const [terms, setTerms] = useState<{ version: string; terms: string } | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getImageLicense().then(setTerms).catch(() => {});
  }, []);

  const pickFile = async (f: File | null) => {
    setError(null);
    if (f && kind === "hero_candidate") {
      const res = await validateHeroFile(f);
      if (!res.ok) {
        setError(res.reason ?? "Bild erfüllt die Hero-Vorgaben nicht.");
        setFile(null);
        return;
      }
    }
    setFile(f);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    if (website) return; // honeypot
    setBusy(true);
    setError(null);
    try {
      await uploadSpotImage(spotId, file, kind, { credit: credit || undefined, licenseAccept: accepted });
      setFile(null);
      setCredit("");
      setAccepted(false);
      setNotice(
        kind === "hero_candidate"
          ? "Danke! Dein Hero-Vorschlag wartet auf Freigabe."
          : "Danke! Dein Bild ist in der Galerie."
      );
      onDone();
      setTimeout(() => {
        setNotice(null);
        onCancel();
      }, 1800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 rounded-xl bg-navy/5 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-medium text-navy">Bild hinzufügen</p>
        <button type="button" onClick={onCancel} className="text-[13px] text-muted hover:text-navy">
          Schließen
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as "gallery" | "hero_candidate");
            setFile(null);
          }}
          className={input}
        >
          <option value="gallery">Galerie</option>
          <option value="hero_candidate">Titelbild-Kandidat</option>
        </select>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="text-[13px] text-navy"
        />
      </div>
      {kind === "hero_candidate" && (
        <p className="mt-1 text-[12px] text-muted">
          Titelbild: mind. {HERO_REQ.minWidth}×{HERO_REQ.minHeight} px, Querformat, JPG/PNG/WebP.
        </p>
      )}
      <input
        value={credit}
        onChange={(e) => setCredit(e.target.value)}
        placeholder="Credit: Name oder Instagram (optional)"
        className={`mt-2 ${input}`}
      />

      <label className="mt-3 flex items-start gap-2 text-[13px] text-navy">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Ich bestätige die{" "}
          <button type="button" onClick={() => setShowTerms((v) => !v)} className="underline">
            Rechte- &amp; Einwilligungserklärung{terms ? ` (${terms.version})` : ""}
          </button>
          .
        </span>
      </label>
      {showTerms && terms && (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-cream p-3 text-[12px] text-navy/80">
          {terms.terms}
        </pre>
      )}

      <Honeypot value={website} onChange={setWebsite} />
      {error && <p role="alert" className="mt-2 text-[13px] text-red-600">{error}</p>}
      {notice && <p role="status" className="mt-2 text-[13px] text-brand-green">{notice}</p>}
      <button type="submit" disabled={busy || !file || !accepted} className={`mt-3 ${primaryBtn}`}>
        {busy ? "Hochladen…" : "Hochladen"}
      </button>
    </form>
  );
}

// A visually-hidden honeypot field: real users never fill it, bots often do.
function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      name="website"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="absolute left-[-9999px] h-0 w-0 opacity-0"
    />
  );
}
