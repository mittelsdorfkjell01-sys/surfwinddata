import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_UNITS, type Units } from "../lib/units";

interface PrefsValue {
  units: Units;
  setUnit: <K extends keyof Units>(key: K, value: Units[K]) => void;
}

const KEY = "swd.prefs";

function load(): Units {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { ...DEFAULT_UNITS, ...(p.units ?? p ?? {}) };
    }
  } catch {
    /* fall through to defaults */
  }
  return DEFAULT_UNITS;
}

const PrefsCtx = createContext<PrefsValue | null>(null);

/**
 * User display preferences (measurement units). Persisted to localStorage and
 * consumed via the lib/units formatters.
 */
export function PrefsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<Units>(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ units }));
  }, [units]);

  const value = useMemo<PrefsValue>(
    () => ({
      units,
      setUnit: (key, val) => setUnits((u) => ({ ...u, [key]: val })),
    }),
    [units]
  );

  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}

export function usePrefs(): PrefsValue {
  const v = useContext(PrefsCtx);
  if (!v) throw new Error("usePrefs must be used within <PrefsProvider>.");
  return v;
}
