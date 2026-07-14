import { Link } from "react-router-dom";
import SportToggle, { type Sport } from "./SportToggle";
import { Wordmark } from "./ui";
import AccountMenu from "./AccountMenu";

/**
 * Floating top bar shared by the map and search pages: brand (left), the sport
 * toggle (centre), and the shared account menu (right). PNG 1 (landing) shows a
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
          <Link to="/" aria-label="surfwind data — Startseite" className="select-none">
            <Wordmark size="md" />
          </Link>

          <div className="hidden sm:block">
            <SportToggle options={sports} value={sport} onChange={onSportChange} />
          </div>

          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
