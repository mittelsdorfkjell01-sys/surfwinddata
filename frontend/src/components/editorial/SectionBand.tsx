import type { ReactNode } from "react";

type Tone = "white" | "cream" | "navy";
type Width = "narrow" | "content" | "wide" | "bleed";
type Pad = "md" | "lg";

const WIDTH_MAX: Record<Width, string> = {
  narrow: "max-w-[720px]",
  content: "max-w-[1180px]",
  wide: "max-w-[1440px]",
  bleed: "max-w-none",
};

const PAD_Y: Record<Pad, string> = {
  lg: "py-[clamp(4rem,9vw,8rem)]",
  md: "py-[clamp(2.5rem,5vw,4rem)]",
};

const TONE_BG: Record<Tone, string> = {
  white: "bg-white",
  cream: "bg-cream",
  navy: "bg-navy text-white",
};

/**
 * A full-bleed editorial section. `tone` alternates the page rhythm
 * (white / cream / navy — navy is reserved for the one dramatic beat per page);
 * `width` sets the reading measure (narrow/content/wide/bleed); vertical
 * padding is fluid. Purely a layout wrapper — no visibility-gating reveal
 * animation, so content is always present (safe in headless renders and on
 * hidden tabs). Motion lives in the specific pieces that need it.
 */
export default function SectionBand({
  id,
  tone = "white",
  width = "content",
  pad = "lg",
  align = "left",
  kicker,
  heading,
  intro,
  className = "",
  children,
}: {
  /** Anchor id for the sticky subnav's jump links. `scroll-mt-24` is applied
   *  alongside it so the target doesn't land underneath the subnav bar. */
  id?: string;
  tone?: Tone;
  width?: Width;
  pad?: Pad;
  align?: "left" | "center";
  kicker?: string;
  heading?: string;
  intro?: string;
  className?: string;
  /** Optional — omit for a header-only band (kicker/heading/intro with no
   *  body), e.g. a centered intro that precedes a separate full-bleed section. */
  children?: ReactNode;
}) {
  const isBleed = width === "bleed";
  const isNavy = tone === "navy";
  const hasHeader = Boolean(kicker || heading || intro);

  return (
    <section id={id} className={`${id ? "scroll-mt-24" : ""} ${TONE_BG[tone]}`}>
      <div
        className={`mx-auto ${WIDTH_MAX[width]} ${
          isBleed ? "px-0" : "px-4 sm:px-8"
        } ${PAD_Y[pad]} ${className}`}
      >
        {hasHeader && (
          <div className={align === "center" ? "text-center" : ""}>
            {kicker && (
              <p
                className={`text-caption font-medium uppercase tracking-[0.18em] ${
                  isNavy ? "text-white/60" : "text-brand-teal"
                }`}
              >
                {kicker}
              </p>
            )}
            {heading && (
              <h2
                className={`text-display-2 font-semibold text-balance ${
                  kicker ? "mt-2" : ""
                } ${isNavy ? "text-white" : "text-navy"}`}
              >
                {heading}
              </h2>
            )}
            {intro && (
              <p
                className={`mt-4 max-w-[60ch] text-body ${
                  align === "center" ? "mx-auto" : ""
                } ${isNavy ? "text-white/70" : "text-navy/70"}`}
              >
                {intro}
              </p>
            )}
          </div>
        )}
        {hasHeader && children != null ? <div className="mt-8">{children}</div> : children}
      </div>
    </section>
  );
}
