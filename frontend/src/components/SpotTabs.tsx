import { useRef, type KeyboardEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import type { LiveConditionsRead } from "../lib/api";
import { degToCompass } from "./WindRose";
import WindArrow from "./WindArrow";

export interface SpotTab {
  id: string;
  label: string;
  href: string;
}

/**
 * Real-route tabs (Info / Daten) — replaces SpotSubnav's jump-link nav, which
 * competed with these as a second navigation system. Sticky at the viewport
 * top, taking over once LandingHeader (an overlay confined to the hero)
 * scrolls out of view. The live wind stays visible here regardless of which
 * tab is active, so switching tabs is never required just to check it.
 */
export default function SpotTabs({ tabs, live }: { tabs: SpotTab[]; live: LiveConditionsRead | null }) {
  const { pathname } = useLocation();
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.href === pathname)
  );
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLAnchorElement>, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = e.key === "ArrowRight" ? (i + 1) % tabs.length : (i - 1 + tabs.length) % tabs.length;
    tabRefs.current[next]?.focus();
  };

  const wind = live?.current.wind;
  const dir = live?.current.dir;

  return (
    <div className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-4 sm:px-8">
        <div role="tablist" aria-label="Spot-Ansicht" className="flex gap-1 py-3">
          {tabs.map((tab, i) => {
            const active = i === activeIndex;
            return (
              <Link
                key={tab.id}
                ref={(el) => (tabRefs.current[i] = el)}
                id={`tab-${tab.id}`}
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                to={tab.href}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`rounded-full px-4 py-2 text-label font-medium transition-colors ${
                  active ? "bg-navy text-white" : "text-muted hover:text-navy"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {typeof wind === "number" && (
          <div className="ml-auto flex shrink-0 items-center gap-1.5 text-ui font-medium text-navy">
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-dot" />
            <WindArrow dir={dir ?? 0} size={16} className="text-navy/60" />
            {Math.round(wind)} kts
            {typeof dir === "number" && <span className="text-caption text-muted">{degToCompass(dir)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
