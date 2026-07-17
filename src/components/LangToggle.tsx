"use client";

import { useLocale } from "@/lib/LangProvider";
import { LOCALES, type Locale } from "@/lib/i18n";

/** Compact TR / EN segmented switch. */
export default function LangToggle({ className = "" }: { className?: string }) {
  const [locale, setLocale] = useLocale();
  return (
    <div
      className={`inline-flex overflow-hidden rounded-lg border border-amber-900/20 bg-white text-xs font-medium ${className}`}
      role="group"
      aria-label="Dil / Language"
    >
      {LOCALES.map((l: Locale) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`px-2.5 py-1 uppercase transition ${
            locale === l
              ? "bg-amber-700 text-white"
              : "text-amber-900/70 hover:bg-amber-50"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
