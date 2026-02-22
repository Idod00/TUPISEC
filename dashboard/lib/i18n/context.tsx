"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { translations, type Lang, type TranslationKey } from "./translations";

const STORAGE_KEY = "tupisec-lang";

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  dateLocale: string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectDefaultLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (stored === "en" || stored === "es") return stored;
  const browser = navigator.language.toLowerCase();
  return browser.startsWith("es") ? "es" : "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(detectDefaultLang());
  }, []);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
  };

  const t = (key: TranslationKey, vars?: Record<string, string | number>): string => {
    const dict = translations[lang] as Record<string, string>;
    let str = dict[key] ?? (translations.en as Record<string, string>)[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  };

  const dateLocale = lang === "es" ? "es-PY" : "en-US";

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dateLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider");
  return ctx;
}
