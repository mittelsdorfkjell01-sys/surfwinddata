import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from "framer-motion";
import { ChevronDownIcon } from "../lib/icons";
import WindArrow from "./WindArrow";

export interface SpotSubnavProps {
  name: string;
  wind?: number;
  /** Not in the original spec's prop shape — needed to orient the wind arrow
   *  meaningfully; see the Sprint 3 report for why it was added. */
  windDir?: number;
  breadcrumb: { label: string; to?: string }[];
  sections: { id: string; label: string }[];
  onBack: () => void;
}

/**
 * Sticky section nav. Invisible while the hero is in view, fades in once the
 * user has scrolled past it (mirrors EditorialHero's own height formula so
 * the handoff feels immediate, not delayed). Carries the breadcrumb — moved
 * here from its own strip below the hero, which just duplicated the region
 * already shown in the hero kicker — plus jump links to the page's sections
 * and the current wind reading.
 */
export default function SpotSubnav({
  name,
  wind,
  windDir,
  breadcrumb,
  sections,
  onBack,
}: SpotSubnavProps) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const thresholdRef = useRef(560 - 80);

  useEffect(() => {
    // Mirrors EditorialHero's own height formula (72dvh, min 560px), so the
    // subnav appears right as the hero scrolls out of view.
    const computeThreshold = () => {
      thresholdRef.current = Math.max(window.innerHeight * 0.72, 560) - 80;
      setVisible(window.scrollY > thresholdRef.current);
    };
    computeThreshold();
    window.addEventListener("resize", computeThreshold);
    return () => window.removeEventListener("resize", computeThreshold);
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setVisible(latest > thresholdRef.current);
  });

  useEffect(() => {
    const targets = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length === 0) return;
        const topmost = intersecting.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        );
        setActiveId(topmost.target.id);
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  // aria-hidden alone doesn't stop keyboard Tab from reaching elements that
  // are only visually off-screen — pull every focusable child out of the tab
  // order too while the bar is hidden (`inert` would be cleaner but isn't in
  // this project's React/TS DOM typings yet).
  const tabbable = visible ? undefined : -1;

  return (
    <motion.div
      initial={false}
      animate={reduce ? undefined : { y: visible ? 0 : -56 }}
      transition={{ duration: 0.3 }}
      style={reduce ? { display: visible ? "block" : "none" } : undefined}
      className="fixed inset-x-0 top-0 z-[900] h-14 border-b border-line bg-white/90 shadow-lift backdrop-blur-xl"
      aria-hidden={!visible}
    >
      <div className="mx-auto flex h-full max-w-[1440px] items-center gap-4 px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            tabIndex={tabbable}
            aria-label="Zurück"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-navy/70 transition-colors hover:bg-navy/5 hover:text-navy"
          >
            <ChevronDownIcon width={18} height={18} className="rotate-90" />
          </button>
          <nav
            aria-label="Breadcrumb"
            className="hidden min-w-0 items-center gap-1.5 text-label text-navy/50 sm:flex"
          >
            {breadcrumb.slice(0, -1).map((c, i) => (
              <span key={c.label + i} className="flex shrink-0 items-center gap-1.5">
                {c.to ? (
                  <Link to={c.to} tabIndex={tabbable} className="hover:text-navy hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span>{c.label}</span>
                )}
                <span aria-hidden="true">›</span>
              </span>
            ))}
          </nav>
          <span className="truncate text-ui font-medium text-navy">{name}</span>
        </div>

        <nav aria-label="Abschnitte" className="hidden flex-1 items-center justify-center gap-6 md:flex">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              tabIndex={tabbable}
              className={`text-label transition-colors hover:text-navy ${
                activeId === s.id ? "text-brand-teal" : "text-muted"
              }`}
            >
              {s.label}
            </a>
          ))}
        </nav>

        {typeof wind === "number" && (
          <div className="ml-auto flex shrink-0 items-center gap-1.5 text-ui font-medium text-navy">
            <WindArrow dir={windDir ?? 0} size={16} className="text-navy/60" />
            {wind} kts
          </div>
        )}
      </div>
    </motion.div>
  );
}
