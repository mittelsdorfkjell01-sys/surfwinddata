import { useState } from "react";

export type Sport = "welle" | "wave" | "wind";

const LABELS: Record<Sport, string> = {
  welle: "Welle",
  wave: "Wave",
  wind: "Wind",
};

interface Props {
  /** Options top → bottom. */
  options?: Sport[];
  defaultValue?: Sport;
  value?: Sport;
  onChange?: (s: Sport) => void;
}

/**
 * Header sport switch. The navy vertical capsule is the track; the white knob
 * slides to the tapped option, and the active label is shown bold.
 */
export default function SportToggle({
  options = ["welle", "wind"],
  defaultValue = "wind",
  value,
  onChange,
}: Props) {
  const [internal, setInternal] = useState<Sport>(defaultValue);
  const active = value ?? internal;
  const activeIndex = Math.max(0, options.indexOf(active));
  const n = options.length;

  const select = (s: Sport) => {
    setInternal(s);
    onChange?.(s);
  };

  return (
    <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow-pill">
      {/* Track + sliding knob */}
      <div
        className="relative w-[14px] shrink-0 rounded-full bg-navy"
        style={{ height: n * 18 }}
      >
        <span
          className="absolute left-1/2 h-[11px] w-[11px] -translate-x-1/2 rounded-full bg-white shadow-sm transition-[top] duration-200 ease-out"
          style={{ top: `calc(${activeIndex + 0.5} * (100% / ${n}) - 5.5px)` }}
        />
      </div>

      {/* Options */}
      <div className="flex flex-col">
        {options.map((key) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              onClick={() => select(key)}
              className={`flex h-[18px] items-center text-left text-[13px] transition-colors ${
                isActive
                  ? "font-semibold text-navy"
                  : "font-normal text-muted hover:text-navy/70"
              }`}
            >
              {LABELS[key]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
