import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, PinIcon, SearchIcon } from "../lib/icons";
import type { Sport } from "./SportToggle";

/** Map the Wind/Welle toggle to the backend's single-valued `sport` filter.
 *  "wind" isn't one backend sport (kite/wind/wing) — kitesurf is the
 *  representative wind discipline; "welle"/"wave" → surf. */
export function sportParam(sport?: Sport): string | undefined {
  if (sport === "welle" || sport === "wave") return "surf";
  if (sport === "wind") return "kitesurf";
  return undefined;
}

/** The floating "WO? / WANN?" search card on the hero. Submits a real
 *  `/search` query and navigates to the results page. */
export default function SearchBar({ sport }: { sport?: Sport }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [week, setWeek] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    const sp = sportParam(sport);
    if (sp) params.set("sport", sp);
    if (week.trim()) params.set("week", week.trim());
    navigate(`/search?${params.toString()}`);
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-3xl bg-white p-2 shadow-card sm:flex-row sm:items-stretch sm:gap-0"
    >
      <label className="flex flex-1 items-center gap-3 rounded-2xl px-5 py-2.5 transition-colors hover:bg-line/30">
        <PinIcon className="shrink-0 text-[19px] text-navy" />
        <span className="flex min-w-0 flex-col">
          <span className="label-caps">Wo?</span>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Region oder Spot suchen"
            className="mt-0.5 w-full bg-transparent text-[14px] text-navy placeholder:text-muted focus:outline-none"
          />
        </span>
      </label>

      <span className="hidden w-px self-stretch bg-line sm:block" />

      <label className="flex flex-1 items-center gap-3 rounded-2xl px-5 py-2.5 transition-colors hover:bg-line/30">
        <CalendarIcon className="shrink-0 text-[19px] text-navy" />
        <span className="flex min-w-0 flex-col">
          <span className="label-caps">Wann? (KW, optional)</span>
          <input
            type="number"
            min={1}
            max={52}
            value={week}
            onChange={(e) => setWeek(e.target.value)}
            placeholder="Kalenderwoche 1–52"
            className="mt-0.5 w-full bg-transparent text-[14px] text-navy placeholder:text-muted focus:outline-none"
          />
        </span>
      </label>

      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-2xl bg-navy px-7 py-3 text-[14px] font-medium text-white transition-colors hover:bg-navy-dark sm:my-0.5"
      >
        <SearchIcon className="text-[17px]" />
        Suchen
      </button>
    </form>
  );
}
