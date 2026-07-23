import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import LandingHeader from "../components/LandingHeader";
import Facilities from "../components/Facilities";
import LocatorMap from "../components/LocatorMap";
import SpotFlowMap from "../components/SpotFlowMap";
import SpotTabs from "../components/SpotTabs";
import Forecast from "../components/Forecast";
import WindMonths from "../components/WindMonths";
import SimilarSpots from "../components/SimilarSpots";
import SpotCommunitySection from "../components/SpotCommunity";
import Footer from "../components/Footer";
import {
  EditorialHero,
  SectionBand,
  Lede,
  FactRow,
  SpotIdentityCard,
} from "../components/editorial";
import { ErrorBanner, EmptyState } from "../components/AsyncStates";
import { ChevronDownIcon } from "../lib/icons";
import { regionSlug } from "../lib/types";
import { useSpot, useSpotLive, useSpotForecast } from "../lib/hooks";
import { facilitiesFromMap, spotFactsFrom } from "../lib/spotView";
import { climatologyToMonths, waterTypeFromCharacter } from "../lib/seasonView";

export default function SpotDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname.endsWith("/daten") ? "daten" : "info";
  const { data: spot, loading, error, reload } = useSpot(id);
  const { data: live } = useSpotLive(id);
  const { data: forecast, loading: forecastLoading, error: forecastError } =
    useSpotForecast(id);

  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/map"));

  if (loading) {
    return (
      <div className="relative min-h-screen bg-white">
        <LandingHeader />
        <div className="hero-h w-full animate-pulse bg-navy-soft" />
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
          <Link to="/" className="mt-4 inline-block text-body text-navy underline">
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  // All from the backend record — no synthetic data.
  const facts = spotFactsFrom(spot);
  const facilities = facilitiesFromMap(spot.facilities);
  const months = climatologyToMonths(spot.climatology);
  const waterType = waterTypeFromCharacter(spot.waterCharacter);
  const currentWind = live?.current.wind ?? undefined;
  const mapCoords = spot.coords ?? [41.18, 9.32];
  const windDir = live?.current.dir ?? spot.windDir ?? 320;
  const regionName = spot.region.split(",")[0].trim() || spot.name;
  const [regionPart, country] = spot.region.split(",").map((p) => p.trim());
  const regionHref = `/region/${regionSlug(spot.region)}`;

  const tabs = id
    ? [
        { id: "info", label: "Info", href: `/spot/${id}` },
        { id: "daten", label: "Daten", href: `/spot/${id}/daten` },
      ]
    : [];

  return (
    <div className="relative min-h-screen bg-white">
      <LandingHeader />

      <main>
        <EditorialHero
          image={spot.hero}
          focal={spot.heroFocal}
          alt={spot.name}
          credit={spot.heroCredit}
          kicker={
            <Link to={regionHref} className="text-white/85 transition-colors hover:text-white">
              {regionName}
            </Link>
          }
        >
          <button
            type="button"
            onClick={goBack}
            aria-label="Zurück"
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white/95 py-2 pl-2.5 pr-4 text-ui font-medium text-brand-teal shadow-pill backdrop-blur transition-colors hover:bg-white"
          >
            <ChevronDownIcon width={18} height={18} className="rotate-90" />
            Zurück
          </button>
        </EditorialHero>

        {/* Name, breadcrumb, coordinates, live wind — overlaps the hero's bottom edge */}
        <div className="relative z-20 mx-auto max-w-[1180px] px-4 sm:px-8">
          <SpotIdentityCard
            name={spot.name}
            regionName={regionPart}
            country={country}
            regionHref={regionHref}
            coords={spot.coords}
            live={live}
          />
        </div>

        {tabs.length > 0 && <SpotTabs tabs={tabs} live={live} />}

        {activeTab === "info" && (
          <>
            {/* Beschreibung: full-width lede, no more sticky rail */}
            <SectionBand tone="white" kicker="Überblick">
              <Lede dropcap>{spot.description}</Lede>
            </SectionBand>

            {/* Steckbrief + Facilities: equal-weight two-up */}
            <SectionBand tone="white">
              <div className="grid gap-x-16 gap-y-12 lg:grid-cols-2">
                <FactRow items={facts} variant="rail" />
                <Facilities items={facilities} variant="rail" />
              </div>
            </SectionBand>

            {/* Locator-Karte: only ever shown with real coordinates */}
            {spot.coords && (
              <SectionBand tone="white" kicker="Lage">
                <LocatorMap coords={spot.coords} />
              </SectionBand>
            )}

            {/* Bildergalerie + Community-Feed — one shared fetch, see SpotCommunitySection */}
            {id && <SpotCommunitySection spotId={id} spotName={spot.name} />}

            {/* Ähnliche Spots */}
            <SectionBand
              tone="white"
              kicker="In der Nähe"
              heading="Ähnliche Spots"
              intro="Vergleichbare Reviere nach Charakter und Windstärke"
            >
              <SimilarSpots spot={spot} />
            </SectionBand>
          </>
        )}

        {activeTab === "daten" && (
          <>
            {/* Wind & Wellen: centered narrow intro, then the flow map */}
            <SectionBand
              tone="white"
              width="narrow"
              align="center"
              kicker="Wind & Wellen"
              heading="Wie es hier läuft"
              intro="Windstreifen ziehen mit dem Wind, Wellenlinien laufen auf die Küste zu — live aus den aktuellen Bedingungen."
            />
            <SectionBand tone="white" pad="md">
              <div className="relative">
                <SpotFlowMap
                  coords={mapCoords}
                  windDir={windDir}
                  windKts={currentWind ?? spot.wind}
                  waveDir={spot.waveDir ?? windDir}
                  coast={spot.coast ?? ((spot.waveDir ?? windDir) + 180) % 360}
                  period={live?.current.period ?? 5}
                  waterType={waterType}
                  zoom={spot.mapView?.zoom}
                  mapCenter={spot.mapView?.center}
                  live={live}
                />
                <div className="glass-white pointer-events-none absolute bottom-4 left-4 z-10 flex items-center gap-4 rounded-full px-4 py-2 text-caption text-navy">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-4 rounded-full bg-navy/60" />
                    Wind
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-4 rounded-full bg-[#2F6FB0]" />
                    Welle
                  </span>
                </div>
              </div>
            </SectionBand>

            {/* Die nächsten 7 Tage — vor den Windmonaten */}
            {(forecastLoading || forecast?.days.length) && (
              <SectionBand tone="white" pad="md" heading="Die nächsten 7 Tage">
                {forecastLoading && <div className="h-56 animate-pulse rounded-3xl bg-line" />}
                {!forecastLoading && forecast && forecast.days.length > 0 && (
                  <Forecast forecast={forecast} coords={spot.coords} />
                )}
                {!forecastLoading && (!forecast || forecast.days.length === 0) && (
                  <EmptyState
                    message={
                      forecastError
                        ? "7-Tage-Vorhersage momentan nicht verfügbar."
                        : "Keine Vorhersage-Daten."
                    }
                  />
                )}
              </SectionBand>
            )}

            {/* Saison */}
            {months && (
              <SectionBand tone="white" kicker="Saison" heading="Wann hierher?">
                <WindMonths climatology={spot.climatology} />
              </SectionBand>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
