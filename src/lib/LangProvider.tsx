"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_LOCALE,
  getDict,
  LOCALE_STORAGE_KEY,
  type Dict,
  type Locale,
} from "./i18n";

interface LangCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dict;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  // Start from the default so server + first client render match (no hydration
  // mismatch); switch to the stored choice right after mount.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY) as
      | Locale
      | null;
    if (stored === "tr" || stored === "en") setLocaleState(stored);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = l;
  }, []);

  const value = useMemo<LangCtx>(
    () => ({ locale, setLocale, t: getDict(locale) }),
    [locale, setLocale]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe fallback so a component used outside the provider still renders.
    return { locale: DEFAULT_LOCALE, setLocale: () => {}, t: getDict(DEFAULT_LOCALE) };
  }
  return ctx;
}

/** The current locale's dictionary. */
export function useT(): Dict {
  return useLang().t;
}

/** [locale, setLocale] for the language switch. */
export function useLocale(): [Locale, (l: Locale) => void] {
  const { locale, setLocale } = useLang();
  return [locale, setLocale];
}
