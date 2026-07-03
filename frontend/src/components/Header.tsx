import { Link } from "react-router-dom";
import SportToggle, { type Sport } from "./SportToggle";
import { MenuIcon, UserIcon } from "../lib/icons";

/**
 * Floating top bar shared by both pages: brand (left), the sport toggle
 * (centre), and the menu + account pill (right). PNG 1 (landing) shows a
 * 2-option toggle, PNG 2 (map) a 3-option one.
 */
export default function Header({
  sports = ["welle", "wind"],
  sport,
  onSportChange,
}: {
  sports?: Sport[];
  sport?: Sport;
  onSportChange?: (s: Sport) => void;
}) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000]">
      <div className="mx-auto max-w-[1400px] px-4 pt-4 sm:px-8 sm:pt-6">
        <div className="pointer-events-auto flex w-full items-center justify-between gap-4">
          <Link to="/" className="select-none text-2xl font-bold tracking-tight text-navy">
            SpotInfo
          </Link>

        <div className="hidden sm:block">
          <SportToggle options={sports} value={sport} onChange={onSportChange} />
        </div>

        <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-pill">
          <button
            type="button"
            aria-label="Menü"
            className="text-navy transition-colors hover:text-navy/60"
          >
            <MenuIcon className="text-[22px]" />
          </button>
          <span className="h-6 w-px bg-line" />
          <button
            type="button"
            aria-label="Konto"
            className="grid h-8 w-8 place-items-center rounded-full bg-navy text-white"
          >
            <UserIcon className="text-[18px]" />
          </button>
          </div>
        </div>
      </div>
    </header>
  );
}
