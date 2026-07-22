/**
 * An "at a glance" facts list. `variant="row"` (default) is the inline
 * definition list, ruled top and bottom — the editorial alternative to a grid
 * of little cards. `variant="rail"` is the hairline-table look for the
 * sticky spec rail next to the lede. Renders nothing when there are no facts.
 */
export default function FactRow({
  items,
  variant = "row",
}: {
  items: { label: string; value: string }[];
  variant?: "row" | "rail";
}) {
  if (items.length === 0) return null;

  if (variant === "rail") {
    return (
      <div>
        <p className="text-caption font-medium uppercase tracking-[0.18em] text-brand-teal">
          Steckbrief
        </p>
        <dl className="mt-4 divide-y divide-line border-t border-line">
          {items.map((f) => (
            <div key={f.label} className="flex items-baseline justify-between gap-6 py-4">
              <dt className="text-caption uppercase tracking-[0.12em] text-muted">{f.label}</dt>
              <dd className="text-right text-body font-medium text-navy">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <dl className="flex flex-wrap items-baseline gap-x-12 gap-y-4 border-y border-line py-6">
      {items.map((f) => (
        <div key={f.label} className="flex flex-col">
          <dt className="text-caption text-muted">{f.label}</dt>
          <dd className="mt-1 text-body font-medium text-navy">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
