import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MenuIcon, UserIcon } from "../lib/icons";

// Account entries with no feature behind them yet are shown as disabled "bald"
// (coming-soon) rows — never a silently-dead click. Utility links point at real
// routes.
const SOON = ["Profil", "Favoriten", "hinzugefügte Spots", "Kontoeinstellungen"];
const UTILITY: { label: string; to: string }[] = [
  { label: "Impressum", to: "/impressum" },
  { label: "Datenschutz", to: "/datenschutz" },
];

/** Account pill + dropdown, shared by the landing and map/search headers. */
export default function AccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

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
            className="absolute right-0 top-[calc(100%+10px)] w-60 rounded-2xl bg-white p-2 shadow-card"
          >
            {SOON.map((label) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                disabled
                aria-disabled="true"
                className="flex w-full cursor-not-allowed items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-muted"
              >
                {label}
                <span className="rounded-full bg-line px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  bald
                </span>
              </button>
            ))}
            <div className="mt-1 border-t border-line pt-1">
              {UTILITY.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-[14px] font-medium text-brand-teal transition-colors hover:bg-cream"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
