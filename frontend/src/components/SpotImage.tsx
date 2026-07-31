import { useEffect, useRef, useState } from "react";

/**
 * A spot's image with a branded fallback and a blur-up load. When `src` is set
 * the photo fades in over a soft, pulsing placeholder (so cards never pop in
 * abruptly or show a broken image). When `src` is empty (a seed spot with no
 * hero uploaded yet), it renders a calm brand-coloured field carrying the spot
 * name + region instead of an external placeholder.
 */
export default function SpotImage({
  src,
  name,
  region,
  className = "",
  compact = false,
}: {
  src?: string;
  name: string;
  region?: string;
  className?: string;
  /** Smaller type for tight cards (map popup / strip). */
  compact?: boolean;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  // Cached images may already be complete before onLoad can attach.
  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, [src]);

  if (src) {
    return (
      <div className="relative h-full w-full">
        <img
          ref={ref}
          src={src}
          alt={name}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover ${className}`}
        />
        {/* Blur-up placeholder: a soft gradient that pulses while loading and
            fades out once the photo is ready. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br from-ink-soft/25 to-band transition-opacity duration-700 ${
            loaded ? "opacity-0" : "animate-pulse opacity-100"
          }`}
        />
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={region ? `${name}, ${region}` : name}
      className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-ink-soft to-[#c2d3e6] px-3 text-center ${className}`}
    >
      <span
        className={`font-semibold leading-tight text-ink-soft ${
          compact ? "text-[13px]" : "text-[15px]"
        }`}
      >
        {name}
      </span>
      {region && (
        <span
          className={`leading-tight text-muted ${
            compact ? "text-[10px]" : "text-[11px]"
          }`}
        >
          {region}
        </span>
      )}
    </div>
  );
}
