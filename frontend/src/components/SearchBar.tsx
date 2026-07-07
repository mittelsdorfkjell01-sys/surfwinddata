import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SearchIcon } from "../lib/icons";
import SearchWhere, { type WherePick } from "./search/SearchWhere";
import SearchWhen from "./search/SearchWhen";
import SearchWhich from "./search/SearchWhich";
import { addRecent } from "../lib/recentSearches";
import {
  buildSearchParams,
  EMPTY_SEARCH,
  whenLabel,
  type SearchValue,
} from "../lib/searchSubmit";

type Segment = "where" | "when" | "which";

const SPORT_UI: Record<string, string> = {
  surf: "Surfen",
  kitesurf: "Kitesurfen",
  windsurf: "Windsurfen",
  wing: "Wing",
};

/**
 * Airbnb-style 3-segment search (Frame_2–5). The bar stays crisp above a
 * page-dimming scrim; the active panel opens below it. Scrim + panel are
 * portalled to <body> so no hero `overflow-hidden`/z-index can clip them — the
 * bar's wrapper in Landing carries a z-index above the scrim so it isn't dimmed.
 */
export default function SearchBar() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<Segment | null>(null);
  const [val, setVal] = useState<SearchValue>(EMPTY_SEARCH);
  const barRef = useRef<HTMLDivElement>(null);
  const whereInput = useRef<HTMLInputElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const openSeg = (s: Segment) => {
    setRect(barRef.current?.getBoundingClientRect() ?? null);
    setOpen(s);
  };
  const close = () => setOpen(null);

  // While open: Esc closes, and scroll/resize collapse the panel (positions are
  // captured at open time).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onScroll = () => close();
    const onResize = () => close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const submit = () => {
    navigate(`/search?${buildSearchParams(val).toString()}`);
    close();
  };

  const pickWhere = (pick: WherePick) => {
    addRecent({ label: pick.label, kind: pick.kind, id: pick.id, country: pick.country });
    setVal((v) => ({ ...v, whereSel: { label: pick.label, kind: pick.kind, id: pick.id }, whereText: pick.label }));
    close();
  };

  const whichText = val.which.length
    ? val.which.length === 1
      ? SPORT_UI[val.which[0]]
      : `${val.which.length} Sportarten`
    : "";

  const dim = (seg: Segment) => !!open && open !== seg;

  return (
    <>
      <div ref={barRef} className="relative">
        <div className="flex items-stretch gap-1 rounded-full bg-white p-2 shadow-card">
          {/* Wohin? — bears the text input */}
          <div
            className={`flex flex-1 flex-col rounded-full px-6 py-2 text-left transition-all ${
              open === "where" ? "shadow-pill" : ""
            } ${dim("where") ? "opacity-55" : ""}`}
            onClick={() => {
              openSeg("where");
              whereInput.current?.focus();
            }}
          >
            <span className="text-[13px] font-semibold text-brand-teal">Wohin?</span>
            <input
              ref={whereInput}
              value={val.whereText}
              onFocus={() => openSeg("where")}
              onChange={(e) =>
                setVal((v) => ({ ...v, whereText: e.target.value, whereSel: null }))
              }
              placeholder="Region oder Spot suchen"
              aria-label="Wohin?"
              aria-expanded={open === "where"}
              className="w-full bg-transparent text-[13px] text-navy placeholder:text-muted focus:outline-none"
            />
          </div>

          <Divider />

          <Segment
            label="Wann?"
            placeholder="Datum wählen"
            value={whenLabel(val.when)}
            active={open === "when"}
            dim={dim("when")}
            onClick={() => openSeg("when")}
          />

          <Divider />

          <Segment
            label="Welche?"
            placeholder="Wähle deine Surfart"
            value={whichText}
            active={open === "which"}
            dim={dim("which")}
            onClick={() => openSeg("which")}
          />

          <button
            type="button"
            onClick={submit}
            aria-label="Suchen"
            className="my-auto ml-1 grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-orange text-white transition-colors hover:bg-brand-orange-dark"
          >
            <SearchIcon className="text-[20px]" />
          </button>
        </div>
      </div>

      {createPortal(
        <AnimatePresence>
          {open && rect && (
            <>
              <motion.div
                key="scrim"
                className="scrim fixed inset-0 z-[1100]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={close}
              />
              <motion.div
                key="panel"
                role="dialog"
                aria-modal="false"
                initial={{ opacity: 0, y: reduce ? 0 : -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{
                  position: "fixed",
                  top: rect.bottom + 12,
                  left: rect.left,
                  width: rect.width,
                  zIndex: 1150,
                }}
                className="max-h-[70vh] overflow-auto rounded-3xl bg-white p-6 shadow-card"
              >
                {open === "where" && <SearchWhere query={val.whereText} onPick={pickWhere} />}
                {open === "when" && (
                  <SearchWhen value={val.when} onChange={(when) => setVal((v) => ({ ...v, when }))} />
                )}
                {open === "which" && (
                  <SearchWhich
                    value={val.which}
                    onChange={(which) => setVal((v) => ({ ...v, which }))}
                  />
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

function Divider() {
  return <span className="my-2 w-px self-stretch bg-line" />;
}

function Segment({
  label,
  placeholder,
  value,
  active,
  dim,
  onClick,
}: {
  label: string;
  placeholder: string;
  value: string;
  active: boolean;
  dim: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={`flex flex-1 flex-col items-start rounded-full px-6 py-2 text-left transition-all ${
        active ? "shadow-pill" : ""
      } ${dim ? "opacity-55" : ""}`}
    >
      <span className="text-[13px] font-semibold text-brand-teal">{label}</span>
      <span className={`truncate text-[13px] ${value ? "text-navy" : "text-muted"}`}>
        {value || placeholder}
      </span>
    </button>
  );
}
