import type { Tip } from "../data/spotDetail";
import { QuoteIcon } from "../lib/icons";

/** "Local Tips" — community quotes with an author line. */
export default function LocalTips({ items }: { items: Tip[] }) {
  return (
    <div className="rounded-2xl bg-[#F1F5FA] p-6">
      <h2 className="mb-4 text-[15px] font-semibold text-navy">Local Tips</h2>

      <div className="space-y-5">
        {items.map((t, i) => (
          <figure key={i} className="relative pl-8">
            <span className="absolute left-0 top-0 text-navy/25">
              <QuoteIcon className="text-[22px]" />
            </span>
            <blockquote className="text-[13px] italic leading-relaxed text-navy/80">
              „{t.text}"
            </blockquote>
            <figcaption className="mt-1.5 text-[12px] font-medium text-muted">
              — {t.author}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
