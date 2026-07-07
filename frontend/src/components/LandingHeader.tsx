import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MenuIcon, UserIcon } from "../lib/icons";

/**
 * Landing-only top bar for the "surfwind data" design (Frame_1 / Frame_5).
 * Transparent over the hero: caps tagline (left), wordmark (centre), the
 * "Füge Spots hinzu" link + an account pill that opens an avatar dropdown.
 *
 * Deliberately separate from the shared `Header.tsx` (which MapView reuses with
 * its SportToggle) so MapView is untouched.
 */

// Account-menu entries. Only routes that actually exist are wired; the rest are
// non-navigating placeholders (no invented pages/auth).
const MENU: { label: string; to?: string }[] = [
  { label: "Profil" },
  { label: "Favoriten" },
  { label: "hinzugefügte Spots" },
  { label: "Kontoeinstellungen" },
];

export default function LandingHeader() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Close on outside-click and Escape while the menu is open.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000]">
      <div className="mx-auto max-w-[1500px] px-4 pt-5 sm:px-10 sm:pt-7">
        <div className="pointer-events-auto grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Left — caps tagline */}
          <span className="hidden select-none text-[12px] font-medium uppercase tracking-[0.14em] text-white/90 sm:block">
            Best collection of surfspots
          </span>

          {/* Centre — wordmark */}
          <Link to="/" className="col-start-2 select-none justify-self-center leading-none">
            <span className="wordmark text-[30px] text-brand-orange sm:text-[34px]">surfwind</span>
            <span className="wordmark ml-1 align-baseline text-[15px] text-brand-teal sm:text-[17px]">
              data
            </span>
          </Link>

          {/* Right — add-spot link + account pill */}
          <div className="col-start-3 flex items-center justify-end gap-4 sm:gap-5">
            <Link
              to="/admin/spot/new"
              className="hidden text-[16px] font-medium text-brand-teal transition-colors hover:text-brand-teal-dark sm:block"
            >
              Füge Spots hinzu
            </Link>

            <div ref={ref} className="relative">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Konto-Menü"
                className="flex items-center gap-2.5 rounded-2xl bg-brand-teal px-3.5 py-2 text-white shadow-pill transition-colors hover:bg-brand-teal-dark"
              >
                <MenuIcon className="text-[20px]" />
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20">
                  <UserIcon className="text-[16px]" />
                </span>
              </button>

              <AnimatePresence>
                {open && (
                  <motion.div
                    role="menu"
                    aria-label="Konto"
                    initial={{ opacity: 0, y: reduce ? 0 : -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: reduce ? 0 : -6 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-[calc(100%+10px)] w-56 rounded-2xl bg-white p-2 shadow-card"
                  >
                    {MENU.map((item, i) =>
                      item.to ? (
                        <Link
                          key={item.label}
                          to={item.to}
                          role="menuitem"
                          onClick={() => setOpen(false)}
                          className="block rounded-xl px-3 py-2.5 text-[14px] font-medium text-brand-teal transition-colors hover:bg-cream"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <button
                          key={item.label}
                          type="button"
                          role="menuitem"
                          onClick={() => setOpen(false)}
                          // Placeholder: no route/auth yet. Hover only, no fake screen.
                          className={`block w-full rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-brand-teal transition-colors hover:bg-cream ${
                            i === MENU.length - 1 ? "mt-1 border-t border-line pt-3" : ""
                          }`}
                          title="bald verfügbar"
                        >
                          {item.label}
                        </button>
                      )
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
