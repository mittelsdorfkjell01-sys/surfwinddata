import { useEffect, useState } from "react";

/** True once the window has scrolled past `threshold` px. Used to shrink /
 *  solidify sticky headers. Passive listener; syncs once on mount. */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(
    () => typeof window !== "undefined" && window.scrollY > threshold
  );
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}
