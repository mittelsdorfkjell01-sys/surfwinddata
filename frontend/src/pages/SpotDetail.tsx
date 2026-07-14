import { Link, useNavigate, useParams } from "react-router-dom";
import LandingHeader from "../components/LandingHeader";
import Facilities from "../components/Facilities";
import SpotFlowMap from "../components/SpotFlowMap";
import Forecast from "../components/Forecast";
import WindMonths from "../components/WindMonths";
import SimilarSpots from "../components/SimilarSpots";
import SpotCommunity from "../components/SpotCommunity";
import Footer from "../components/Footer";
import {
  EditorialHero,
  SectionBand,
  Lede,
  FactRow,
  ConditionsBand,
} from "../components/editorial";
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
        <div className="h-[72vh] min-h-[560px] w-full animate-pulse bg-navy-soft" />
        <div className="mx-auto max-w-[1180px] px-4 pt-16 sm:px-8">
          <div className="h-8 w-2/3 animate-pulse rounded bg-line" />
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

  return (
    <div className="relative min-h-screen bg-white">
      <LandingHeader />

      <main>
        <EditorialHero
          image={spot.hero}
          focal={spot.heroFocal}
          alt={spot.name}
          kicker={
            <Link
              to={`/region/${regionSlug(spot.region)}`}
              className="text-white/85 transition-colors hover:text-white"
            >
              {regionName}
            </Link>
          }
          title={spot.name}
          meta={
            currentWind ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-dot" />
                {currentWind} kts <span className="text-white/70">gerade</span>
              </span>
            ) : undefined
          }
        >
          <button
            type="button"
            onClick={goBack}
            aria-label="Zurück"
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white/95 py-2 pl-2.5 pr-4 text-[14px] font-medium text-brand-teal shadow-pill backdrop-blur transition-colors hover:bg-white"
          >
            <ChevronDownIcon className="rotate-90 text-[18px]" />
            Zurück
          </button>
        </EditorialHero>

        {/* Breadcrumb */}
        <div className="mx-auto max-w-[1180px] px-4 pt-6 sm:px-8">
          <nav className="text-[13px] font-medium text-navy/60">
            {breadcrumb.map((crumb, i) => (
              <span key={crumb}>
                {i > 0 && <span className="mx-1.5 text-muted">›</span>}
                <span className={i === breadcrumb.length - 1 ? "text-brand-teal" : ""}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
        </div>

        {/* Lede + at-a-glance facts */}
        <SectionBand tone="white">
          <Lede>{spot.description}</Lede>
          {facts.length > 0 && (
            <div className="mt-8">
              <FactRow items={facts} />
            </div>
          )}
        </SectionBand>

        {/* Conditions now — the bold live band */}
        <SectionBand tone="cream">
          <ConditionsBand live={live} />
        </SectionBand>

        {/* Signature: the animated wind & wave flow map */}
        <SectionBand tone="white" heading="Wind & Wellen an diesem Spot">
          <div className="rounded-2xl shadow-card">
            <SpotFlowMap
              coords={coords}
              windDir={windDir}
              windKts={currentWind ?? spot.wind}
              waveDir={spot.waveDir ?? windDir}
              coast={spot.coast ?? ((spot.waveDir ?? windDir) + 180) % 360}
              period={live?.current.period ?? 5}
              waterType={waterType}
              zoom={spot.mapView?.zoom}
              mapCenter={spot.mapView?.center}
            />
          </div>
          <p className="mt-3 text-caption text-muted">
            Windstreifen ziehen mit dem Wind, Wellenlinien laufen auf die Küste zu —
            live aus den aktuellen Bedingungen.
          </p>
        </SectionBand>

        {/* Timing: 7-day forecast + yearly wind rhythm */}
        {(forecastLoading || forecastDays?.length || months) && (
          <SectionBand tone="cream" heading="Wann läuft's?">
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
            {months && (
              <div className="mt-12">
                <WindMonths data={months} />
              </div>
            )}
          </SectionBand>
        )}

        {/* Vor Ort */}
        {facilities.length > 0 && (
          <SectionBand tone="white">
            <Facilities items={facilities} />
          </SectionBand>
        )}

        {/* Community */}
        {id && (
          <SectionBand tone="cream">
            <SpotCommunity spotId={id} />
          </SectionBand>
        )}

        {/* Ähnliche Spots */}
        <SectionBand tone="white">
          <SimilarSpots spot={spot} />
        </SectionBand>
      </main>

      <Footer />
    </div>
  );
}
