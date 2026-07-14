/**
 * Design token — the shared visual definition for every text-like form control
 * (input / select / textarea). One source of truth so all fields look and,
 * crucially, *focus* identically: a visible teal ring on keyboard focus
 * (WCAG 2.4.7) instead of the old outline-none-with-no-replacement pattern.
 */
export const fieldClass =
  "w-full rounded-xl border border-navy/15 bg-white px-3 py-2 text-ui text-navy outline-none transition-colors focus:border-navy/40";
