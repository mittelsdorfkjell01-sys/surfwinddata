import { useEffect, useRef, useState } from "react";
import { heroManifest } from "../heroManifest";

const MIME: Record<string, string> = {
  avif: "image/avif",
  webp: "image/webp",
  jpg: "image/jpeg",
};

/** "/hero-welle.jpg" | "/hero-welle-1920.jpg" → "hero-welle" (manifest key). */
function keyFromSrc(src: string): string {
  const file = src.split("/").pop() ?? "";
  return file
    .replace(/\.(avif|webp|jpe?g|png)$/i, "")
    .replace(/-\d+$/, "");
}

/**
 * Full-bleed hero image. When the source has generated variants (see
 * scripts/gen_hero.py → heroManifest), it emits a <picture> with AVIF/WebP/JPEG
 * sources and a width-descriptor srcset + sizes="100vw", so the browser loads
 * the smallest file that still covers the display's CSS width × DPR — no
 * upscaling up to the largest generated width, and no oversized download on
 * mobile. Unknown/remote sources (e.g. picsum) render as a plain <img>.
 *
 * `fadeIn` blurs the photo up (fades from transparent once decoded) — used on the
 * spot/region hero where a dark backdrop sits behind it. Off by default so the
 * landing's LCP hero paints immediately.
 */
export default function HeroImage({
  src,
  fallbackSrc,
  alt,
  className,
  focal,
  fadeIn = false,
}: {
  src: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  focal?: { x: number; y: number } | null;
  fadeIn?: boolean;
}) {
  const entry = src.startsWith("/") ? heroManifest[keyFromSrc(src)] : undefined;
  const style = focal ? { objectPosition: `${focal.x}% ${focal.y}%` } : undefined;

  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(!fadeIn);
  useEffect(() => {
    if (fadeIn && ref.current?.complete) setLoaded(true);
  }, [fadeIn, src]);

  const onError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (fallbackSrc && e.currentTarget.src !== fallbackSrc) {
      e.currentTarget.src = fallbackSrc;
    }
  };

  const imgClassName = fadeIn
    ? `${className ?? ""} transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`
    : className;
  const shared = {
    ref,
    alt,
    style,
    onError,
    onLoad: fadeIn ? () => setLoaded(true) : undefined,
    className: imgClassName,
  };

  if (!entry) {
    return <img src={src} {...shared} />;
  }

  const key = keyFromSrc(src);
  return (
    <picture>
      {entry.formats.map((fmt) => (
        <source
          key={fmt}
          type={MIME[fmt]}
          sizes="100vw"
          srcSet={entry.widths.map((w) => `/${key}-${w}.${fmt} ${w}w`).join(", ")}
        />
      ))}
      <img src={entry.fallback} {...shared} />
    </picture>
  );
}
