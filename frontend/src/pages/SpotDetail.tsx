import { Link, useNavigate, useParams } from "react-router-dom";
import { WindBadge } from "../components/SpotBits";
import HeroImage from "../components/HeroImage";
import LiveConditions from "../components/LiveConditions";
import Facilities from "../components/Facilities";
import LocalTips from "../components/LocalTips";
import SpotFlowMap from "../components/SpotFlowMap";
import Forecast from "../components/Forecast";
import WindMonths from "../components/WindMonths";
import SimilarSpots from "../components/SimilarSpots";
import { CloseIcon } from "../lib/icons";
import { getSpot, regionSlug } from "../data/spots";
import { getSpotDetail } from "../data/spotDetail";

export default function SpotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const spot = getSpot(id);

  if (!spot) {
    return (
      <div className="grid min-h-screen place-items-center bg-white px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Spot nicht gefunden</h1>
          <Link to="/" className="mt-4 inline-block text-[15px] text-navy underline">
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const detail = getSpotDetail(spot);
  const coords = spot.coords ?? [41.18, 9.32];
  const windDir = spot.windDir ?? 320;
  const regionName = spot.region.split(",")[0].trim();

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/map"));

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero: full-bleed image with the spot card floating ON it (as in the PNG) ── */}
      <section className="relative">
        <div className="relative h-[64vh] min-h-[520px] w-full overflow-hidden bg-navy-soft">
          <HeroImage
            src={spot.hero ?? spot.image}
            fallbackSrc={spot.image}
            alt={spot.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10" />

          {/* Close button — aligned to the content edge (same as the map below) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20">
            <div className="mx-auto flex max-w-[1400px] justify-end px-4 pt-5 sm:px-8">
              <button
                type="button"
                onClick={goBack}
                aria-label="Schließen"
                className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-white text-navy shadow-pill transition-colors hover:bg-white/90"
              >
                <CloseIcon className="text-[20px]" />
              </button>
            </div>
          </div>

          {/* Floating card sitting on the image, per the mock */}
          <div className="absolute inset-x-0 bottom-8 z-10 px-4 sm:px-8">
            <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 rounded-3xl bg-white px-7 py-6 shadow-card sm:px-10 sm:py-7">
              <div className="min-w-0">
                <h1 className="truncate text-[26px] font-semibold leading-tight text-navy sm:text-[32px]">
                  {spot.name}
                </h1>
                <Link
                  to={`/region/${regionSlug(spot.region)}`}
                  className="text-[14px] text-muted underline-offset-2 hover:underline"
                >
                  {regionName}
                </Link>
              </div>
              <div className="shrink-0 scale-125 sm:scale-[1.4]">
                <WindBadge value={spot.wind} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Body — same width as the landing page ── */}
      <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-16 sm:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-[13px] font-medium text-navy/70">
          {detail.breadcrumb.map((crumb, i) => (
            <span key={crumb}>
              {i > 0 && <span className="mx-1.5 text-muted">›</span>}
              <span className={i === detail.breadcrumb.length - 1 ? "text-navy" : ""}>{crumb}</span>
            </span>
          ))}
        </nav>

        {/* Über den Spot + Aktuelle Bedingungen (schmal, mittig) + Karte */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px_minmax(0,1fr)]">
          <div>
            <h2 className="mb-3 text-[15px] font-semibold text-navy">Über den Spot</h2>
            <p className="text-[15px] leading-relaxed text-navy/75">{detail.description}</p>
          </div>
          <div>
            <LiveConditions live={detail.live} />
          </div>
          <div>
            <SpotFlowMap
              coords={coords}
              windDir={windDir}
              windKts={spot.wind}
              waveDir={spot.waveDir ?? windDir}
              coast={spot.coast ?? ((spot.waveDir ?? windDir) + 180) % 360}
              period={detail.live.period}
              waterType={detail.waterType}
            />
          </div>
        </div>

        {/* 7-Tage Forecast — volle Breite */}
        <div className="mt-12">
          <Forecast days={detail.forecast} />
        </div>

        {/* Windmonate (Reihe 1) */}
        <div className="mt-14">
          <WindMonths data={detail.months} />
        </div>

        {/* Facilities + Local Tips (Reihe 2) */}
        <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-2">
          <Facilities items={detail.facilities} />
          <LocalTips items={detail.tips} />
        </div>

        {/* Ähnliche Spots */}
        <div className="mt-20">
          <SimilarSpots spot={spot} />
        </div>
      </div>
    </div>
  );
}
