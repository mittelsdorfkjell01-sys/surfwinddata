import { useState } from "react";
import { getAdminKey, setAdminKey } from "../lib/adminKey";

/**
 * Lets a curator enter the shared admin key for this session. The key is sent as
 * the `X-Admin-Key` header on every /admin request (see lib/api.ts). Held in
 * memory + sessionStorage only — cleared when the tab closes.
 *
 * NOTE: a single shared key is not a user-auth system. It gates writes for an
 * internal test operation; it does not distinguish editors or grant per-user
 * rights. That is a deliberate limitation.
 */
export default function AdminKeyBar() {
  const [value, setValue] = useState(getAdminKey() ?? "");
  const [saved, setSaved] = useState(false);
  const active = Boolean(getAdminKey());

  const apply = () => {
    setAdminKey(value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="rounded-2xl bg-navy/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <label className="text-[13px] font-medium text-navy" htmlFor="admin-key">
          Admin-Key
          <span className="ml-2 font-normal text-muted">
            (nur nötig, wenn der Server <code>ADMIN_KEY</code> gesetzt hat)
          </span>
        </label>
        <span
          className={`text-[12px] font-medium ${active ? "text-brand-green" : "text-muted"}`}
        >
          {active ? "● aktiv" : "○ nicht gesetzt"}
        </span>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          id="admin-key"
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="X-Admin-Key"
          autoComplete="off"
          className="w-full rounded-xl border border-navy/15 bg-white px-3 py-2 text-[14px] text-navy outline-none focus:border-navy/40"
        />
        <button
          type="button"
          onClick={apply}
          className="shrink-0 rounded-xl bg-navy px-4 py-2 text-[13px] font-medium text-white hover:bg-navy-dark"
        >
          {saved ? "✓ Gesetzt" : "Übernehmen"}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        Gilt nur für diese Session (nicht dauerhaft gespeichert). Kein Nutzer-Login —
        ein gemeinsamer Schlüssel für den internen Testbetrieb.
      </p>
    </div>
  );
}
