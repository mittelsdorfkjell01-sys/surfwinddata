import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import HeroImage from "../HeroImage";

/**
 * Full-bleed editorial hero. Two states, both deliberately designed:
 *  • with photo → cinematic HeroImage, focal-point aware, gentle load-scale.
 *  • without photo → a brand colour field (.editorial-hero-fallback) with a
 *    faint animated wind motif, so a missing image never reads as empty/broken.
 *
 * `children` is a top slot (e.g. a back pill) tucked below the floating header.
 * The `title` renders as the page's single <h1> in Poppins display size (not the
 * wordmark face).
 */
export default function EditorialHero({
  image,
  focal,
  alt,
  kicker,
  title,
  meta,
  children,
}: {
  image?: string | null;
  focal?: { x: number; y: number } | null;
  alt: string;
  kicker?: ReactNode;
  title: string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <section className="relative h-[72vh] min-h-[560px] w-full overflow-hidden bg-navy">
      {image ? (
        <motion.div
          initial={reduce ? false : { scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <HeroImage
            src={image}
            alt={alt}
            focal={focal}
            className="h-full w-full object-cover"
          />
        </motion.div>
      ) : (
        <div className="editorial-hero-fallback absolute inset-0" role="img" aria-label={alt}>
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className="swd-wind-streak absolute block h-24 w-[2px] rounded-full bg-white/40"
                style={{ left: `${12 + i * 14}%`, top: "18%", animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* scrim for legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-black/25" />

      {/* top slot (back pill etc.) */}
      {children && (
        <div className="pointer-events-none absolute inset-x-0 top-[104px] z-20 sm:top-[120px]">
          <div className="mx-auto flex max-w-[1180px] px-4 sm:px-8">{children}</div>
        </div>
      )}

      {/* headline block */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="mx-auto max-w-[1180px] px-4 pb-10 sm:px-8 sm:pb-14">
          {kicker && (
            <div className="mb-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-white/85">
              {kicker}
            </div>
          )}
          <h1 className="text-display-1 font-bold text-white text-balance drop-shadow-[0_2px_14px_rgba(0,0,0,0.4)]">
            {title}
          </h1>
          {meta && <div className="mt-3 text-[15px] font-medium text-white/90">{meta}</div>}
        </div>
      </div>
    </section>
  );
}
