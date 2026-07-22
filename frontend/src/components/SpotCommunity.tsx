// Public community section on the spot page: a photo gallery, ratings and
// local tips. Content is shown first; the input forms are collapsed behind a
// button ("Bewerten" / "Kommentar verfassen" / "+") so the page stays calm
// and reading-first. Names are required (first name, or first + last).

import { useEffect, useId, useState, type FormEvent } from "react";
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
import { QuoteIcon } from "../lib/icons";
import { Button, Input, Select, Textarea } from "./ui";

const SPORTS = ["kitesurf", "windsurf", "wing", "surf"];
const REPORT_REASONS: { key: string; label: string }[] = [
  { key: "copyright", label: "Urheberrecht / mein Bild" },
  { key: "inappropriate", label: "Unangemessen" },
  { key: "wrong_spot", label: "Falscher Spot" },
  { key: "other", label: "Sonstiges" },
];

// The gallery bleeds full-width but its text/controls stay aligned to the
// normal 1180px content column — `max(gutter, centered-gutter)` mirrors
// SectionBand's own centering math without needing the section's padding.
const INSET = "pl-4 sm:pl-[max(2rem,calc((100vw-1180px)/2))]";

// Name must be a first name, or first + last (1–2 words, letters only).
const NAME_RE = /^\p{L}[\p{L}'.-]*(?:\s+\p{L}[\p{L}'.-]*)?$/u;
const validName = (n: string) => NAME_RE.test(n.trim());

const STAR_PATH =
  "M12 2.5l2.7 5.6 6.1.9-4.4 4.4 1 6.1L12 16.6l-5.4 2.9 1-6.1-4.4-4.4 6.1-.9L12 2.5Z";

/** Solid single-color star — the clickable rating picker (binary filled/empty
 *  per star; only the read-only `Stars` below needs fractional fill). */
function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <path d={STAR_PATH} className={filled ? "fill-brand-orange" : "fill-line"} />
    </svg>
  );
}

/** Read-only fractional-fill star row (an orange path clipped to the
 *  fractional width, over a line-coloured base) — replaces the old ★ text
 *  glyph, which renders as a colour emoji on some platforms and can't show a
 *  partial star at all. */
function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const uid = useId();
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} von 5 Sternen`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const pct = Math.max(0, Math.min(1, value - i));
        const clipId = `${uid}-${i}`;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <clipPath id={clipId}>
                <rect x="0" y="0" width={24 * pct} height="24" />
              </clipPath>
            </defs>
            <path d={STAR_PATH} className="fill-line" />
            <path d={STAR_PATH} className="fill-brand-orange" clipPath={`url(#${clipId})`} />
          </svg>
        );
      })}
    </span>
  );
}

/** Ratings (5/12) + Tips (7/12) — headless: the section heading lives in the
 *  caller's `SectionBand`. The gallery is a separate export, `CommunityGallery`
 *  below, so the page can run it full-bleed in its own section. */
export default function SpotCommunity({ spotId }: { spotId: string }) {
  return (
    <div className="grid gap-x-16 gap-y-12 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <Ratings spotId={spotId} />
      </div>
      <div className="lg:col-span-7">
        <Tips spotId={spotId} />
      </div>
    </div>
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
    <div className="border-t border-line pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-title font-semibold text-navy">Bewertungen</h3>
          {agg && agg.count > 0 ? (
            <>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-stat font-semibold tabular-nums text-navy">
                  {agg.avg?.toFixed(1)}
                </span>
                <Stars value={agg.avg ?? 0} size={18} />
              </div>
              <p className="mt-1 text-caption text-muted">{agg.count} Bewertungen</p>
            </>
          ) : (
            <p className="mt-2 text-label text-muted">Noch keine Bewertungen.</p>
          )}
        </div>
        {!open && (
          <Button variant="ghost" onClick={() => setOpen(true)}>
            Bewerten
          </Button>
        )}
      </div>

      {error && <p role="alert" className="mt-2 text-label text-red-600">{error}</p>}

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
        <ul className="mt-6 divide-y divide-line">
          {items.map((r) => (
            <li key={r.id} className="py-4">
              <div className="flex items-center justify-between">
                <Stars value={r.stars} />
                <span className="text-caption text-muted">
                  {sportLabel(r.sport)} · {levelLabel(r.skill_level)}
                </span>
              </div>
              <p className="mt-2 text-ui text-navy/90">{r.conditions}</p>
              <p className="mt-1 text-caption text-muted">— {r.author_name}</p>
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
    <form onSubmit={submit} className="mt-4 rounded-3xl bg-navy/5 p-4">
      <p className="text-label font-medium text-navy">Deine Bewertung</p>
      {/* clickable stars */}
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} Sterne`}
            onClick={() => setStars(n)}
            className="transition-transform hover:scale-110"
          >
            <StarIcon filled={n <= stars} />
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <label className="text-label text-muted">
          Level
          <Select value={skill} onChange={(e) => setSkill(e.target.value)} className="mt-1">
            {LEVELS.map((l) => (
              <option key={l} value={l}>{levelLabel(l)}</option>
            ))}
          </Select>
        </label>
        <label className="text-label text-muted">
          Sportart
          <Select value={sport} onChange={(e) => setSport(e.target.value)} className="mt-1">
            {SPORTS.map((s) => (
              <option key={s} value={s}>{sportLabel(s)}</option>
            ))}
          </Select>
        </label>
      </div>
      <Textarea
        required
        value={conditions}
        onChange={(e) => setConditions(e.target.value)}
        placeholder="Welche Bedingungen bist du gefahren? (Pflichtfeld)"
        className="mt-2"
        rows={2}
      />
      <Input
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Vorname oder Vor- und Nachname (Pflichtfeld)"
        className="mt-2"
        required
      />
      <Honeypot value={website} onChange={setWebsite} />
      {error && <p role="alert" className="mt-2 text-label text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button type="submit" disabled={busy || !conditions.trim()}>
          {busy ? "Senden…" : "Bewertung abgeben"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}

// --- tips (a quote list, not a card stack) ----------------------------------

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
    <div className="border-t border-line pt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-title font-semibold text-navy">Local Tips</h3>
        {!open && (
          <Button variant="ghost" onClick={() => setOpen(true)}>
            Kommentar verfassen
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-label text-muted">Noch keine Tipps.</p>
      ) : (
        <ul className="mt-6 space-y-6">
          {items.map((t) => (
            <li key={t.id} className="border-l-2 border-brand-teal/30 pl-6">
              <QuoteIcon width={16} height={16} className="text-brand-teal/40" />
              <p className="mt-2 text-caption uppercase tracking-[0.14em] text-muted">
                {t.author_name}
              </p>
              <p className="mt-1 text-body leading-relaxed text-navy/80">{t.body}</p>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form onSubmit={submit} className="mt-4 rounded-3xl bg-navy/5 p-4">
          <Textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Dein Tipp für diesen Spot"
            rows={2}
          />
          <Input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Vorname oder Vor- und Nachname (Pflichtfeld)"
            className="mt-2"
            required
          />
          <Honeypot value={website} onChange={setWebsite} />
          {error && <p role="alert" className="mt-2 text-label text-red-600">{error}</p>}
          <div className="mt-3 flex gap-2">
            <Button type="submit" disabled={busy || !body.trim()}>
              {busy ? "Senden…" : "Tipp teilen"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// --- gallery + upload + report ----------------------------------------------

/** The photo gallery — a separate export so the page can run it full-bleed
 *  in its own `SectionBand width="bleed"`, ahead of ratings/tips (Sprint 5:
 *  the product is image-led, so the gallery leads the community section). */
export function CommunityGallery({ spotId }: { spotId: string }) {
  const [items, setItems] = useState<CommunityImage[]>([]);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const load = () =>
    getSpotImages(spotId).then((r) => setItems(r.items)).catch(() => {});

  useEffect(() => {
    void load();
  }, [spotId]);

  return (
    <div>
      <div className={`flex items-center justify-between pr-4 ${INSET}`}>
        <h3 className="text-title font-semibold text-navy">Bildergalerie</h3>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-8 w-8 place-items-center rounded-full bg-navy text-title leading-none text-white hover:bg-navy-dark"
            aria-label="Bild hinzufügen"
            title="Bild hinzufügen"
          >
            +
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className={`mt-3 text-label text-muted ${INSET}`}>Noch keine Bilder.</p>
      ) : (
        <div className={`mt-4 flex snap-x-mandatory gap-4 overflow-x-auto no-scrollbar pb-2 pr-4 ${INSET}`}>
          {items.map((img) => (
            <figure
              key={img.id}
              className="group relative aspect-[3/4] w-[260px] shrink-0 snap-start overflow-hidden rounded-3xl"
            >
              <img
                src={resolveMediaUrl(img.url)}
                alt={img.credit ?? ""}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              {img.credit && (
                <figcaption className="absolute inset-x-0 bottom-0 bg-navy/60 px-3 py-1.5 text-caption text-white">
                  {img.credit}
                </figcaption>
              )}
              {/* Always visible (not hover-only) so it's reachable on touch,
                  not just with a mouse. */}
              <button
                type="button"
                onClick={() => setReportFor(img.id)}
                className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-caption font-medium text-navy transition-colors hover:bg-white"
              >
                Melden
              </button>
            </figure>
          ))}
        </div>
      )}

      {reportFor && (
        <div className={INSET}>
          <ReportDialog
            imageId={reportFor}
            onClose={() => setReportFor(null)}
            onDone={() => setReportFor(null)}
          />
        </div>
      )}

      {open && (
        <div className={INSET}>
          <UploadForm spotId={spotId} onCancel={() => setOpen(false)} onDone={load} />
        </div>
      )}
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
    <div className="mt-4 rounded-3xl border border-line bg-cream p-4">
      <div className="flex items-center justify-between">
        <p className="text-ui font-medium text-navy">Bild melden</p>
        <button type="button" onClick={onClose} className="text-label text-muted hover:text-navy">
          Schließen
        </button>
      </div>
      {contact !== null ? (
        <p role="status" className="mt-2 text-label text-brand-green">
          Danke, deine Meldung ist eingegangen.
          {contact && <> Bei dringenden Rechtefragen: {contact}</>}
        </p>
      ) : (
        <>
          <Select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-2">
            {REPORT_REASONS.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </Select>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anmerkung (optional)"
            className="mt-2"
            rows={2}
          />
          {error && <p role="alert" className="mt-2 text-label text-red-600">{error}</p>}
          <Button type="button" disabled={busy} onClick={submit} className="mt-3">
            {busy ? "Senden…" : "Melden"}
          </Button>
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
    <form onSubmit={submit} className="mt-5 rounded-3xl bg-navy/5 p-4">
      <div className="flex items-center justify-between">
        <p className="text-ui font-medium text-navy">Bild hinzufügen</p>
        <button type="button" onClick={onCancel} className="text-label text-muted hover:text-navy">
          Schließen
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as "gallery" | "hero_candidate");
            setFile(null);
          }}
        >
          <option value="gallery">Galerie</option>
          <option value="hero_candidate">Titelbild-Kandidat</option>
        </Select>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="text-label text-navy"
        />
      </div>
      {kind === "hero_candidate" && (
        <p className="mt-1 text-caption text-muted">
          Titelbild: mind. {HERO_REQ.minWidth}×{HERO_REQ.minHeight} px, Querformat, JPG/PNG/WebP.
        </p>
      )}
      <Input
        value={credit}
        onChange={(e) => setCredit(e.target.value)}
        placeholder="Credit: Name oder Instagram (optional)"
        className="mt-2"
      />

      <label className="mt-3 flex items-start gap-2 text-label text-navy">
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
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-cream p-3 text-caption text-navy/80">
          {terms.terms}
        </pre>
      )}

      <Honeypot value={website} onChange={setWebsite} />
      {error && <p role="alert" className="mt-2 text-label text-red-600">{error}</p>}
      {notice && <p role="status" className="mt-2 text-label text-brand-green">{notice}</p>}
      <Button type="submit" disabled={busy || !file || !accepted} className="mt-3">
        {busy ? "Hochladen…" : "Hochladen"}
      </Button>
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
