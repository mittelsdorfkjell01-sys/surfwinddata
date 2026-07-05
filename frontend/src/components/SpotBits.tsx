import type { Tag } from "../lib/types";

/** Green-dot wind reading, e.g. "• 17 kts". Shows "—" when the value is unknown. */
export function WindBadge({ value }: { value?: number | null }) {
  const known = typeof value === "number" && value > 0;
  return (
    <div className="flex items-baseline gap-1 whitespace-nowrap">
      <span className="mr-0.5 inline-block h-1.5 w-1.5 translate-y-[-1px] rounded-full bg-dot" />
      <span className="text-[15px] font-medium text-navy">{known ? value : "—"}</span>
      <span className="text-[12px] font-medium text-navy/70">kts</span>
    </div>
  );
}

const tagStyles: Record<Tag["kind"], string> = {
  wave: "bg-navy text-white",
  level: "bg-brand-green text-white",
  water: "border border-navy/70 text-navy",
};

export function TagPill({ tag }: { tag: Tag }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-none ${tagStyles[tag.kind]}`}
    >
      {tag.label}
    </span>
  );
}
