/**
 * An inline "at a glance" facts row (definition list, ruled top and bottom) —
 * the editorial alternative to a grid of little cards. Renders nothing when
 * there are no facts.
 */
export default function FactRow({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <dl className="flex flex-wrap items-baseline gap-x-10 gap-y-4 border-y border-line py-5">
      {items.map((f) => (
        <div key={f.label} className="flex flex-col">
          <dt className="text-caption text-muted">{f.label}</dt>
          <dd className="mt-1 text-[15px] font-medium text-navy">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
