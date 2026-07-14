import type { ReactNode } from "react";

/**
 * A full-bleed editorial section. `tone` alternates the page rhythm (white /
 * cream); vertical padding is fluid. Purely a layout wrapper — no visibility-
 * gating reveal animation, so content is always present (safe in headless
 * renders and on hidden tabs). Motion lives in the specific pieces that need it.
 */
export default function SectionBand({
  tone = "white",
  heading,
  intro,
  className = "",
  children,
}: {
  tone?: "white" | "cream";
  heading?: string;
  intro?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={tone === "cream" ? "bg-cream" : "bg-white"}>
      <div
        className={`mx-auto max-w-[1180px] px-4 py-[clamp(2.5rem,6vw,5.5rem)] sm:px-8 ${className}`}
      >
        {heading && (
          <h2 className="text-display-2 font-semibold text-navy text-balance">{heading}</h2>
        )}
        {intro && <p className="mt-3 max-w-[60ch] text-[15px] text-navy/70">{intro}</p>}
        {heading || intro ? <div className="mt-8">{children}</div> : children}
      </div>
    </section>
  );
}
