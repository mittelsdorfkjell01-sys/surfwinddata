import { Link } from "react-router-dom";
import { Wordmark } from "./ui";
import AccountMenu from "./AccountMenu";
import { useScrolled } from "../lib/useScrolled";

/**
 * Solid sticky top bar for white content pages (search, account, legal). Stays
 * pinned and shrinks subtly on scroll — the padding tightens and a hairline +
 * translucent blur appear, so the brand stays reachable without a hard edge.
 * (The landing/map/spot pages keep their own transparent-over-hero headers.)
 */
export default function StickyHeader() {
  const scrolled = useScrolled(8);
  return (
    <header
      className={`sticky top-0 z-[1000] bg-white/85 backdrop-blur transition-all duration-200 ${
        scrolled ? "border-b border-line py-2.5" : "border-b border-transparent py-5"
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-8">
        <Link
          to="/"
          aria-label="surfwind data — Startseite"
          className="select-none leading-none"
        >
          <Wordmark size="md" />
        </Link>
        <AccountMenu />
      </div>
    </header>
  );
}
