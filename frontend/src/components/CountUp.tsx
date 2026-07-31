import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Counts an integer up from 0 to `to` (easeOutCubic) the first time it scrolls
 * into view. Renders the rounded value + optional suffix. Under reduced-motion
 * it shows the final value immediately.
 */
export default function CountUp({
  to,
  durationMs = 900,
  suffix = "",
  className = "",
}: {
  to: number;
  durationMs?: number;
  suffix?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(reduce ? to : 0);

  useEffect(() => {
    if (reduce) {
      setVal(to);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVal(to);
      return;
    }
    let raf = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / durationMs);
        setVal(to * (1 - Math.pow(1 - p, 3))); // easeOutCubic
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, durationMs, reduce]);

  return (
    <span ref={ref} className={className}>
      {Math.round(val)}
      {suffix}
    </span>
  );
}
