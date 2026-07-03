import { CalendarIcon, PinIcon, SearchIcon } from "../lib/icons";

/** The floating "WO? / WANN?" search card on the hero. */
export default function SearchBar() {
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-2 rounded-3xl bg-white p-2 shadow-card sm:flex-row sm:items-stretch sm:gap-0"
    >
      <label className="flex flex-1 items-center gap-3 rounded-2xl px-5 py-2.5 transition-colors hover:bg-line/30">
        <PinIcon className="shrink-0 text-[19px] text-navy" />
        <span className="flex min-w-0 flex-col">
          <span className="label-caps">Wo?</span>
          <input
            type="text"
            placeholder="Region oder Spot suchen"
            className="mt-0.5 w-full bg-transparent text-[14px] text-navy placeholder:text-muted focus:outline-none"
          />
        </span>
      </label>

      <span className="hidden w-px self-stretch bg-line sm:block" />

      <label className="flex flex-1 items-center gap-3 rounded-2xl px-5 py-2.5 transition-colors hover:bg-line/30">
        <CalendarIcon className="shrink-0 text-[19px] text-navy" />
        <span className="flex min-w-0 flex-col">
          <span className="label-caps">Wann?</span>
          <input
            type="text"
            placeholder="Datum wählen"
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
