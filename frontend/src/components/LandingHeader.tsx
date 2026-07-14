import { Link, useLocation } from "react-router-dom";
import { MapIcon } from "../lib/icons";
import { INCLUDE_ADMIN } from "../lib/target";
import { Wordmark } from "./ui";
import AccountMenu from "./AccountMenu";

/**
 * Landing-only top bar for the "surfwind data" design (Frame_1 / Frame_5).
 * Transparent over the hero: caps tagline (left), wordmark (centre), the map
 * link, the "Füge Spots hinzu" link (admin build) and the shared account menu.
 *
 * Deliberately separate from the shared `Header.tsx` (which MapView reuses with
 * its SportToggle).
 */
export default function LandingHeader() {
  const location = useLocation();
  // Remember where the map is opened from, so the map's close button can return
  // here instead of always landing on "/".
  const from = location.pathname + location.search;

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000]">
      <div className="mx-auto max-w-[1500px] px-4 pt-9 sm:px-10 sm:pt-12">
        <div className="pointer-events-auto grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Left — caps tagline */}
          <span className="hidden select-none text-[12px] font-medium uppercase tracking-[0.14em] text-white/90 sm:block">
            Best collection of surfspots
          </span>

          {/* Centre — wordmark */}
          <Link
            to="/"
            aria-label="surfwind data — Startseite"
            className="col-start-2 select-none justify-self-center leading-none"
          >
            <Wordmark size="xl" />
          </Link>

          {/* Right — map button + add-spot link + account menu */}
          <div className="col-start-3 flex items-center justify-end gap-3 sm:gap-5">
            <Link
              to="/map"
              state={{ from }}
              aria-label="Karte öffnen"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-[15px] font-medium text-brand-teal shadow-pill transition-colors hover:bg-cream"
            >
              <MapIcon className="text-[18px]" />
              <span className="hidden sm:inline">Karte</span>
            </Link>

            {INCLUDE_ADMIN && (
              <Link
                to="/admin/spot/new"
                className="hidden text-[16px] font-medium text-brand-teal transition-colors hover:text-brand-teal-dark sm:block"
              >
                Füge Spots hinzu
              </Link>
            )}

            <AccountMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
