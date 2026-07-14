import { Link, useNavigate, useParams } from "react-router-dom";
import { WindBadge } from "../components/SpotBits";
import LandingHeader from "../components/LandingHeader";
import HeroImage from "../components/HeroImage";
import SpotImage from "../components/SpotImage";
import LiveConditions from "../components/LiveConditions";
import Facilities from "../components/Facilities";
import SpotFacts from "../components/SpotFacts";
import SpotFlowMap from "../components/SpotFlowMap";
import Forecast from "../components/Forecast";
import WindMonths from "../components/WindMonths";
import SimilarSpots from "../components/SimilarSpots";
import SpotCommunity from "../components/SpotCommunity";
import Footer from "../components/Footer";
import { ErrorBanner, EmptyState } from "../components/AsyncStates";
import { ChevronDownIcon } from "../lib/icons";
import { regionSlug } from "../lib/types";
import { useSpot, useSpotLive, useSpotForecast } from "../lib/hooks";
import { facilitiesFromMap, spotFactsFrom } from "../lib/spotView";
import {
  climatologyToMonths,
  forecastToDays,
  waterTypeFromCharacter,
} from "../lib/seasonView";

export default function SpotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: spot, loading, error, reload } = useSpot(id);
  const { data: live } = useSpotLive(id);
  const { data: forecast, loading: forecastLoading, error: forecastError } =
    useSpotForecast(id);

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/map"));

  if (loading) {
    return (
      <div className="relative min-h-screen bg-white">
        <LandingHeader />
        <div className="h-[64vh] min-h-[520px] w-full animate-pulse bg-navy-soft" />
        <div className="mx-auto max-w-[1400px] px-4 pt-16 sm:px-8">
          <div className="h-6 w-2/3 animate-pulse rounded bg-line" />
          <div className="mt-4 h-4 w-full animate-pulse rounded bg-line" />
        </div>
      </div>
    );
  }

  if (error || !spot) {
    return (
      <div className="grid min-h-screen place-items-center bg-white px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-navy">Spot nicht gefunden</h1>
          {error && (
            <div className="mt-4 max-w-md">
              <ErrorBanner message={error} onRetry={reload} />
            </div>
          )}
          <Link to="/" className="mt-4 inline-block text-[15px] text-navy underline">
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  // All from the backend record — no synthetic data.
  const facts = spotFactsFrom(spot);
  const facilities = facilitiesFromMap(spot.facilities);
  const forecastDays = forecast ? forecastToDays(forecast) : null;
  const months = climatologyToMonths(spot.climatology);
  const waterType = waterTypeFromCharacter(spot.waterCharacter);
  const currentWind = live?.current.wind ?? undefined;
  const coords = spot.coords ?? [41.18, 9.32];
  const windDir = live?.current.dir ?? spot.windDir ?? 320;
  const regionName = spot.region.split(",")[0].trim() || spot.name;
  const parts = spot.region.split(",").map((p) => p.trim());
  const breadcrumb = [parts[1], parts[0], spot.name].filter(Boolean) as string[];
  const description = spot.description;
  const liveConditions = live && {
    wind: live.current.wind ?? 0,
    gust: live.current.gust ?? 0,
    windDir: live.current.dir ?? windDir,
    wave: live.current.swell ?? 0,
    period: live.current.period ?? 0,
    waterTemp: live.current.sst ?? 0,
    airTemp: live.current.air ?? 0,
  };

  return (
    <div className="relative min-h-screen bg-white">
      <LandingHeader />

      <main>
      {/* ── Hero: full-bleed image with the spot card floating ON it (as in the PNG) ── */}
      <section className="relative">
        <div className="relative h-[64vh] min-h-[520px] w-full overflow-hidden bg-navy-soft">
          {spot.hero ? (
            <HeroImage
              src={spot.hero}
              alt={spot.name}
              className="h-full w-full object-cover"
              focal={spot.heroFocal}
            />
          ) : (
            <SpotImage name={spot.name} region={spot.region} />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10" />

          {/* Back — landing-style white pill, tucked below the floating header so it
              never collides with the account pill on the right. */}
          <div className="pointer-events-none absolute inset-x-0 top-[104px] z-20 sm:top-[120px]">
            <div className="mx-auto flex max-w-[1500px] px-4 sm:px-10">
              <button
                type="button"
                onClick={goBack}
                aria-label="Zurück"
                className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white/95 py-2 pl-2.5 pr-4 text-[14px] font-medium text-brand-teal shadow-pill backdrop-blur transition-colors hover:bg-white"
              >
                <ChevronDownIcon className="rotate-90 text-[18px]" />
                Zurück
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
                  className="text-[14px] font-medium text-brand-teal underline-offset-2 hover:underline"
                >
                  {regionName}
                </Link>
              </div>
              <div className="shrink-0 scale-125 sm:scale-[1.4]">
                <WindBadge value={currentWind} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Body — same width as the landing page ── */}
      <div className="mx-auto max-w-[1400px] px-4 pb-24 pt-16 sm:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-[13px] font-medium text-navy/70">
          {breadcrumb.map((crumb, i) => (
            <span key={crumb}>
              {i > 0 && <span className="mx-1.5 text-muted">›</span>}
              <span className={i === breadcrumb.length - 1 ? "text-brand-teal" : ""}>{crumb}</span>
            </span>
          ))}
        </nav>

        {/* Über den Spot + Aktuelle Bedingungen (schmal, mittig) + Karte */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px_minmax(0,1fr)]">
          <div>
            <h2 className="mb-3 text-[15px] font-semibold text-navy">Über den Spot</h2>
            <p className="text-[15px] leading-relaxed text-navy/75">
              {description || (
                <span className="text-muted">Noch keine Beschreibung hinterlegt.</span>
              )}
            </p>
            {facts.length > 0 && (
              <div className="mt-6">
                <SpotFacts facts={facts} />
              </div>
            )}
          </div>
          <div>
            {liveConditions ? (
              <LiveConditions live={liveConditions} />
            ) : (
              <div className="rounded-3xl bg-cream px-4 py-6 text-center text-[13px] text-muted">
                Live-Bedingungen momentan nicht verfügbar.
              </div>
            )}
          </div>
          <div>
            <SpotFlowMap
              coords={coords}
              windDir={windDir}
              windKts={currentWind ?? spot.wind}
              waveDir={spot.waveDir ?? windDir}
              coast={spot.coast ?? ((spot.waveDir ?? windDir) + 180) % 360}
              period={liveConditions?.period ?? 5}
              waterType={waterType}
              zoom={spot.mapView?.zoom}
              mapCenter={spot.mapView?.center}
            />
          </div>
        </div>

        {/* 7-Tage Forecast — volle Breite */}
        <div className="mt-12">
          {forecastLoading && <div className="h-56 animate-pulse rounded-2xl bg-line" />}
          {!forecastLoading && forecastDays && forecastDays.length > 0 && (
            <Forecast days={forecastDays} />
          )}
          {!forecastLoading && (!forecastDays || forecastDays.length === 0) && (
            <EmptyState
              message={
                forecastError
                  ? "7-Tage-Vorhersage momentan nicht verfügbar."
                  : "Keine Vorhersage-Daten."
              }
            />
          )}
        </div>

        {/* Windmonate — nur wenn Klimatologie vorliegt */}
        {months && (
          <div className="mt-14">
            <WindMonths data={months} />
          </div>
        )}

        {/* Facilities */}
        {facilities.length > 0 && (
          <div className="mt-14">
            <Facilities items={facilities} />
          </div>
        )}

        {/* Community: Bewertungen, Tips, Bildergalerie */}
        {id && (
          <div className="mt-20">
            <SpotCommunity spotId={id} />
          </div>
        )}

        {/* Ähnliche Spots */}
        <div className="mt-20">
          <SimilarSpots spot={spot} />
        </div>
      </div>
      </main>

      <Footer />
    </div>
  );
}
