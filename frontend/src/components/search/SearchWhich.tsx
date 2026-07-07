// "Welche?" panel — multi-select sport checkboxes (Frame_2). UI labels are the
// design's German words; the values are the backend sport keys.

const OPTIONS: { value: string; label: string }[] = [
  { value: "surf", label: "Surfen" },
  { value: "kitesurf", label: "Kitesurfen" },
  { value: "windsurf", label: "Windsurfen" },
  { value: "wing", label: "Wing" },
];

export default function SearchWhich({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div className="flex flex-col">
      {OPTIONS.map((o) => (
        <label
          key={o.value}
          className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-cream"
        >
          <span className="text-[15px] text-brand-teal">{o.label}</span>
          <input
            type="checkbox"
            checked={value.includes(o.value)}
            onChange={() => toggle(o.value)}
            className="h-5 w-5 shrink-0 accent-brand-orange"
          />
        </label>
      ))}
    </div>
  );
}
