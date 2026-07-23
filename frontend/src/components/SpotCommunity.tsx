// Public community section on the spot page: a single chronological feed —
// rating/tip/photo posts merged client-side (see lib/communityFeed, since the
// backend still has three separate endpoints and this sprint adds none) —
// plus the filmstrip gallery, which draws its photos from that same feed.
// The composer is always visible (no hidden "Bewerten" button to find first)
// and posts stars + text + an optional photo in one action.

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ApiError,
  getImageLicense,
  getRatings,
  getSpotImages,
  getTips,
  postRating,
  reportImage,
  resolveMediaUrl,
  uploadSpotImage,
  type CommunityImage,
  type RatingItem,
  type TipItem,
} from "../lib/api";
import { HERO_REQ, validateHeroFile } from "./ImageUpload";
import { LEVELS, levelLabel, sportLabel } from "../lib/labels";
import { ChevronDownIcon, CloseIcon } from "../lib/icons";
import { Button, Input, Select, Textarea } from "./ui";
import { usePersistedState } from "../lib/hooks";
import { SectionBand } from "./editorial";
import {
  avatarColor,
  encodeVisitDate,
  feedPhotos,
  formatVisitDate,
  initials,
  mergeFeed,
  relativeTime,
  sortFeed,
  type FeedPost,
  type FeedSort,
} from "../lib/communityFeed";

const SPORTS = ["kitesurf", "windsurf", "wing", "surf"];
const REPORT_REASONS: { key: string; label: string }[] = [
  { key: "copyright", label: "Urheberrecht / mein Bild" },
  { key: "inappropriate", label: "Unangemessen" },
  { key: "wrong_spot", label: "Falscher Spot" },
  { key: "other", label: "Sonstiges" },
];

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

/** Read-only fractional-fill star row. */
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

/**
 * The whole community area: the gallery filmstrip (photos drawn from the
 * feed, see below) and the feed itself. One shared fetch (ratings/tips/images)
 * feeds both, in two SectionBands so the page keeps its white→cream rhythm.
 */
export default function SpotCommunitySection({ spotId, spotName }: { spotId: string; spotName: string }) {
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [tips, setTips] = useState<TipItem[]>([]);
  const [images, setImages] = useState<CommunityImage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setLoadError(null);
    void getRatings(spotId)
      .then((r) => setRatings(r.items))
      .catch(() => setLoadError("Beiträge konnten nicht vollständig geladen werden."));
    void getTips(spotId).then((r) => setTips(r.items)).catch(() => {});
    void getSpotImages(spotId).then((r) => setImages(r.items)).catch(() => {});
  };

  useEffect(() => {
    load();
  }, [spotId]);

  const posts = useMemo(() => mergeFeed({ ratings, tips, images }), [ratings, tips, images]);
  const photos = useMemo(() => feedPhotos(posts), [posts]);

  return (
    <>
      <SectionBand tone="white" pad="md">
        <CommunityGalleryFilmstrip spotId={spotId} images={photos} />
      </SectionBand>
      <SectionBand
        tone="cream"
        kicker="Community"
        heading="Community"
        intro="Erfahrungen und Tipps von anderen vor Ort. Bitte fair und sachlich bleiben."
      >
        <CommunityFeed spotId={spotId} spotName={spotName} posts={posts} loadError={loadError} onPosted={load} />
      </SectionBand>
    </>
  );
}

// --- composer ----------------------------------------------------------------

/** Always visible, star-first: no "Bewerten" button to reveal it. Picking a
 *  star expands the rest (text, sport, level, visit date, photo). Submits a
 *  single rating (stars + free text) and, if a photo was attached, a second
 *  upload call right after — the closest the current API gets to "one post,
 *  one action" without a dedicated endpoint. */
function Composer({
  spotId,
  spotName,
  onPosted,
}: {
  spotId: string;
  spotName: string;
  onPosted: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [stars, setStars] = useState(0);
  const [text, setText] = useState("");
  const [sport, setSport] = useState("kitesurf");
  const [skill, setSkill] = useState("intermediate");
  const [visitedAt, setVisitedAt] = useState("");
  const [author, setAuthor] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [file, setFile] = useState<File | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [terms, setTerms] = useState<{ version: string; terms: string } | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getImageLicense().then(setTerms).catch(() => {});
  }, []);

  const pickStar = (n: number) => {
    setStars(n);
    setExpanded(true);
  };

  const reset = () => {
    setExpanded(false);
    setStars(0);
    setText("");
    setVisitedAt("");
    setFile(null);
    setAccepted(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (stars < 1) return setError("Bitte eine Sternebewertung wählen.");
    if (!text.trim()) return setError("Bitte kurz schreiben, wie es war.");
    if (!validName(author)) return setError("Bitte Vorname (oder Vor- und Nachname) angeben.");
    if (file && !accepted) return setError("Bitte die Rechteerklärung fürs Foto bestätigen.");
    setError(null);
    setBusy(true);
    try {
      const conditions = encodeVisitDate(visitedAt, text.trim());
      await postRating(spotId, {
        stars,
        skill_level: skill,
        sport,
        conditions,
        author_name: author.trim(),
        website,
      });
      if (file) {
        await uploadSpotImage(spotId, file, "gallery", { credit: author.trim(), licenseAccept: accepted });
      }
      reset();
      onPosted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Senden fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-3xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-body font-medium text-navy">Wie war's am {spotName}?</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} Sterne`}
              onClick={() => pickStar(n)}
              className="transition-transform hover:scale-110"
            >
              <StarIcon filled={n <= stars} />
            </button>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          <Textarea
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Wie waren die Bedingungen? Was sollten andere wissen? (Pflichtfeld)"
            rows={3}
          />
          <div className="flex flex-wrap gap-3">
            <label className="text-label text-muted">
              Sportart
              <Select value={sport} onChange={(e) => setSport(e.target.value)} className="mt-1">
                {SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {sportLabel(s)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-label text-muted">
              Level
              <Select value={skill} onChange={(e) => setSkill(e.target.value)} className="mt-1">
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {levelLabel(l)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-label text-muted">
              Besuchsdatum
              <Input
                type="date"
                value={visitedAt}
                onChange={(e) => setVisitedAt(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="mt-1"
              />
            </label>
          </div>

          <Input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Vorname oder Vor- und Nachname (Pflichtfeld)"
            required
          />

          <div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-label text-navy"
            />
            {file && (
              <label className="mt-2 flex items-start gap-2 text-label text-navy">
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
            )}
            {showTerms && terms && (
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-cream p-3 text-caption text-navy/80">
                {terms.terms}
              </pre>
            )}
          </div>

          <Honeypot value={website} onChange={setWebsite} />
          {error && (
            <p role="alert" className="text-label text-red-600">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Senden…" : "Veröffentlichen"}
            </Button>
            <Button type="button" variant="ghost" onClick={reset}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

// --- feed ----------------------------------------------------------------

function CommunityFeed({
  spotId,
  spotName,
  posts,
  loadError,
  onPosted,
}: {
  spotId: string;
  spotName: string;
  posts: FeedPost[];
  loadError: string | null;
  onPosted: () => void;
}) {
  const [sort, setSort] = usePersistedState<FeedSort>("swd.communityFeedSort", "newest");
  // Client-side only — there's no backend counter for "helpful" (no new
  // endpoint this sprint), so this reflects this browser, not every visitor.
  const [helpfulCounts, setHelpfulCounts] = usePersistedState<Record<string, number>>(
    `swd.communityHelpful.${spotId}`,
    {}
  );
  const [votedIds, setVotedIds] = usePersistedState<string[]>(`swd.communityVoted.${spotId}`, []);
  const [reportFor, setReportFor] = useState<string | null>(null);

  const sorted = useMemo(() => sortFeed(posts, sort, helpfulCounts), [posts, sort, helpfulCounts]);

  const markHelpful = (id: string) => {
    if (votedIds.includes(id)) return;
    setHelpfulCounts((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    setVotedIds((prev) => [...prev, id]);
  };

  const composer = <Composer spotId={spotId} spotName={spotName} onPosted={onPosted} />;

  return (
    <div>
      {posts.length === 0 ? (
        <>
          <div className="rounded-3xl border border-dashed border-line bg-white/60 px-6 py-8 text-center">
            <p className="text-body font-medium text-navy">Sei der Erste, der von hier berichtet.</p>
            <p className="mx-auto mt-2 max-w-[46ch] text-caption text-muted">
              Hilfreiche Beiträge nennen Bedingungen, Level und was andere vor Ort wissen sollten.
            </p>
          </div>
          <div className="mt-4">{composer}</div>
        </>
      ) : (
        <>
          {composer}

          <div className="mt-6 flex items-center justify-end gap-1 text-label">
            {(["newest", "helpful"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                aria-pressed={sort === s}
                className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                  sort === s ? "bg-navy text-white" : "text-muted hover:text-navy"
                }`}
              >
                {s === "newest" ? "Neueste" : "Hilfreichste"}
              </button>
            ))}
          </div>

          <ul className="mt-4 space-y-4">
            {sorted.map((post) => (
              <li key={post.id}>
                <FeedPostCard
                  post={post}
                  helpfulCount={helpfulCounts[post.id] ?? 0}
                  voted={votedIds.includes(post.id)}
                  onHelpful={() => markHelpful(post.id)}
                  onReport={setReportFor}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {loadError && (
        <p role="alert" className="mt-4 text-label text-red-600">
          {loadError}
        </p>
      )}

      {reportFor && (
        <ReportDialog imageId={reportFor} onClose={() => setReportFor(null)} onDone={() => setReportFor(null)} />
      )}
    </div>
  );
}

function FeedPostCard({
  post,
  helpfulCount,
  voted,
  onHelpful,
  onReport,
}: {
  post: FeedPost;
  helpfulCount: number;
  voted: boolean;
  onHelpful: () => void;
  onReport: (imageId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <article className="rounded-3xl border border-line bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-label font-semibold text-white"
          style={{ backgroundColor: avatarColor(post.authorName) }}
        >
          {initials(post.authorName)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-body font-semibold text-navy">{post.authorName}</span>
            {post.skillLevel && (
              <span className="rounded-full bg-navy/5 px-2 py-0.5 text-caption font-medium text-navy/70">
                {levelLabel(post.skillLevel)}
              </span>
            )}
            {post.sport && (
              <span className="rounded-full bg-brand-teal/10 px-2 py-0.5 text-caption font-medium text-brand-teal">
                {sportLabel(post.sport)}
              </span>
            )}
          </div>

          {post.stars != null && (
            <div className="mt-1.5">
              <Stars value={post.stars} size={14} />
            </div>
          )}

          {post.text && <p className="mt-2 text-ui leading-relaxed text-navy/90">{post.text}</p>}

          {post.photo && (
            <img
              src={resolveMediaUrl(post.photo.url)}
              alt={post.photo.credit ?? ""}
              className="mt-3 max-h-96 w-full rounded-2xl object-cover"
              loading="lazy"
            />
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted">
            {post.visitedAt && <span className="font-medium text-navy/70">{formatVisitDate(post.visitedAt)}</span>}
            <span>{relativeTime(post.createdAt)}</span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onHelpful}
              disabled={voted}
              aria-pressed={voted}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-caption font-medium transition-colors disabled:cursor-default ${
                voted
                  ? "border-brand-green/30 bg-brand-green/10 text-brand-green"
                  : "border-line text-muted hover:text-navy"
              }`}
            >
              Hilfreich{helpfulCount > 0 ? ` · ${helpfulCount}` : ""}
            </button>

            {post.reportImageId && (
              <div ref={menuRef} className="relative ml-auto">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Weitere Aktionen"
                  className="grid h-8 w-8 place-items-center rounded-full text-label text-muted hover:bg-navy/5 hover:text-navy"
                >
                  ⋯
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+6px)] z-10 w-40 rounded-xl bg-white p-1 shadow-card"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onReport(post.reportImageId!);
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-left text-label text-navy hover:bg-cream"
                    >
                      Melden
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// --- gallery filmstrip + hero-candidate proposal + report -------------------

/** The filmstrip — a horizontal snap gallery that works identically at 2
 *  photos or 20: fixed-width portrait tiles, the next one always cut off at
 *  the edge as a scroll affordance. Its photos come from the feed (see
 *  `feedPhotos`); the only way to add a *post* photo is the composer above —
 *  no second upload button here. "Titelbild vorschlagen" is a distinct,
 *  deliberately understated action (proposing the page's cover photo, via its
 *  own admin review queue), not a second way to add a gallery photo. */
function CommunityGalleryFilmstrip({ spotId, images }: { spotId: string; images: CommunityImage[] }) {
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [heroFormOpen, setHeroFormOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHoverCapable(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [images]);

  const scrollByTile = (dir: 1 | -1) => scrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-title font-semibold text-navy">Bildergalerie</h3>
        {!heroFormOpen && (
          <button
            type="button"
            onClick={() => setHeroFormOpen(true)}
            className="text-label font-medium text-brand-teal hover:text-brand-teal-dark"
          >
            Titelbild vorschlagen
          </button>
        )}
      </div>

      {images.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-line bg-cream/60 px-6 py-10 text-center">
          <p className="text-body font-medium text-navy">Noch keine Bilder von diesem Spot.</p>
          <p className="mx-auto max-w-[42ch] text-caption text-muted">
            Fotos kommen aus den Beiträgen weiter unten — teil deins mit dem ersten Bericht.
          </p>
        </div>
      ) : (
        <div className="relative mt-4">
          {hoverCapable && canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollByTile(-1)}
              aria-label="Zurückscrollen"
              className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 place-items-center rounded-full bg-white/90 p-2 text-navy shadow-pill transition-colors hover:bg-white sm:grid"
            >
              <ChevronDownIcon width={18} height={18} className="rotate-90" />
            </button>
          )}
          {hoverCapable && canScrollRight && (
            <button
              type="button"
              onClick={() => scrollByTile(1)}
              aria-label="Weiterscrollen"
              className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 place-items-center rounded-full bg-white/90 p-2 text-navy shadow-pill transition-colors hover:bg-white sm:grid"
            >
              <ChevronDownIcon width={18} height={18} className="-rotate-90" />
            </button>
          )}

          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            className="flex snap-x-mandatory gap-2 overflow-x-auto no-scrollbar pb-2"
          >
            {images.map((img, i) => (
              <figure
                key={img.id}
                className="group relative aspect-[14/19] w-[280px] shrink-0 snap-start overflow-hidden rounded-3xl"
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  aria-label={`Bild vergrößern${img.credit ? ` — ${img.credit}` : ""}`}
                  className="absolute inset-0 h-full w-full"
                >
                  <img
                    src={resolveMediaUrl(img.url)}
                    alt={img.credit ?? ""}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </button>
                {img.credit && (
                  <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-navy/60 px-3 py-1.5 text-caption text-white">
                    {img.credit}
                  </figcaption>
                )}
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
        </div>
      )}

      {reportFor && (
        <ReportDialog imageId={reportFor} onClose={() => setReportFor(null)} onDone={() => setReportFor(null)} />
      )}

      {heroFormOpen && (
        <HeroCandidateForm spotId={spotId} onCancel={() => setHeroFormOpen(false)} onDone={() => setHeroFormOpen(false)} />
      )}

      {lightboxIndex !== null && (
        <Lightbox
          items={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}
    </div>
  );
}

/** Full-screen lightbox: blurred scrim, swipe (touch) / arrow keys (desktop)
 *  to move between images, Esc to close, and a Tab-cycling focus trap so
 *  keyboard focus can't escape onto the page behind it. */
function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: CommunityImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const go = (delta: number) => onIndexChange((index + delta + items.length) % items.length);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowRight") return go(1);
      if (e.key === "ArrowLeft") return go(-1);
      if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length]);

  const img = items[index];

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Bildergalerie, groß"
      tabIndex={-1}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-navy-dark/85 p-4 backdrop-blur-md"
      onClick={onClose}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(dx) > 40) go(dx > 0 ? -1 : 1);
        touchStartX.current = null;
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Schließen"
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <CloseIcon width={20} height={20} />
      </button>

      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Vorheriges Bild"
            className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:grid"
          >
            <ChevronDownIcon width={20} height={20} className="rotate-90" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Nächstes Bild"
            className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:grid"
          >
            <ChevronDownIcon width={20} height={20} className="-rotate-90" />
          </button>
        </>
      )}

      <figure className="max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
        <img
          src={resolveMediaUrl(img.url)}
          alt={img.credit ?? ""}
          className="max-h-[80vh] max-w-[92vw] rounded-2xl object-contain"
        />
        {img.credit && <figcaption className="mt-3 text-center text-caption text-white/80">{img.credit}</figcaption>}
      </figure>
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

/** Proposing the page's *hero* photo is a different action from adding a
 *  gallery photo (it goes through its own admin review queue) — kept as its
 *  own small, deliberately understated form rather than folded into the main
 *  composer, so "share what happened here" and "suggest a new cover photo"
 *  don't compete for attention. */
function HeroCandidateForm({
  spotId,
  onDone,
  onCancel,
}: {
  spotId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
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
    if (f) {
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
      await uploadSpotImage(spotId, file, "hero_candidate", { credit: credit || undefined, licenseAccept: accepted });
      setFile(null);
      setCredit("");
      setAccepted(false);
      setNotice("Danke! Dein Titelbild-Vorschlag wartet auf Freigabe.");
      setTimeout(() => {
        setNotice(null);
        onDone();
      }, 1800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 rounded-3xl bg-navy/5 p-4">
      <div className="flex items-center justify-between">
        <p className="text-ui font-medium text-navy">Titelbild vorschlagen</p>
        <button type="button" onClick={onCancel} className="text-label text-muted hover:text-navy">
          Schließen
        </button>
      </div>
      <p className="mt-1 text-caption text-muted">
        Mind. {HERO_REQ.minWidth}×{HERO_REQ.minHeight} px, Querformat, JPG/PNG/WebP.
      </p>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        className="mt-2 text-label text-navy"
      />
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
        {busy ? "Hochladen…" : "Vorschlagen"}
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
