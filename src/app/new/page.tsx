"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import { createBook } from "@/lib/api";
import { useAuth } from "@/lib/owner";
import { THEME_LIST, getTheme } from "@/lib/themes";
import { TEMPLATES } from "@/lib/templates";
import { useT, useLocale } from "@/lib/LangProvider";
import type { ThemeKey } from "@/lib/types";

export default function NewBookPage() {
  const router = useRouter();
  const t = useT();
  const [locale] = useLocale();
  const [creating, setCreating] = useState<string | null>(null);
  useAuth(true);

  async function create(opts: {
    themeKey?: ThemeKey;
    templateKey?: string;
    docType?: "book" | "certificate" | "site";
  }) {
    if (creating) return;
    setCreating(opts.docType ?? opts.templateKey ?? opts.themeKey ?? "x");
    try {
      const book = await createBook({ ...opts, locale });
      router.push(`/editor/${book.id}`);
    } catch {
      setCreating(null);
      alert(t.create.failed);
    }
  }

  return (
    <div className="min-h-screen bg-[#efe6d2]">
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-10">
        {/* ---- What do you want to create? ---- */}
        <h1 className="text-2xl font-bold text-amber-950">{t.create.heading}</h1>
        <p className="mb-5 text-sm text-amber-900/60">{t.create.sub}</p>
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col justify-between rounded-2xl border border-amber-900/15 bg-white p-5 shadow-sm">
            <div>
              <div className="text-3xl">📖</div>
              <div className="mt-2 text-lg font-semibold text-amber-950">
                {t.create.bookTitle}
              </div>
              <p className="mt-1 text-sm text-amber-900/60">
                {t.create.bookDesc}
              </p>
            </div>
          </div>
          <button
            onClick={() => create({ docType: "certificate" })}
            disabled={!!creating}
            className="group flex flex-col justify-between rounded-2xl border border-amber-700/40 bg-gradient-to-br from-amber-50 to-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
          >
            <div>
              <div className="text-3xl">🎓</div>
              <div className="mt-2 text-lg font-semibold text-amber-950">
                {t.create.certTitle}
              </div>
              <p className="mt-1 text-sm text-amber-900/60">
                {t.create.certDesc}
              </p>
            </div>
            <span className="mt-3 inline-block text-sm font-medium text-amber-700">
              {creating === "certificate"
                ? t.create.creating
                : t.create.certCreate}
            </span>
          </button>
          <button
            onClick={() => create({ docType: "site" })}
            disabled={!!creating}
            className="group flex flex-col justify-between rounded-2xl border border-amber-700/40 bg-gradient-to-br from-sky-50 to-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
          >
            <div>
              <div className="text-3xl">🌐</div>
              <div className="mt-2 text-lg font-semibold text-amber-950">
                {t.create.siteTitle}
              </div>
              <p className="mt-1 text-sm text-amber-900/60">
                {t.create.siteDesc}
              </p>
            </div>
            <span className="mt-3 inline-block text-sm font-medium text-sky-700">
              {creating === "site" ? t.create.creating : t.create.siteCreate}
            </span>
          </button>
        </div>

        {/* ---- Magazine templates ---- */}
        <h1 className="text-2xl font-bold text-amber-950">
          Hazır dergi şablonları
        </h1>
        <p className="mb-7 text-sm text-amber-900/60">
          Profesyonelce hazırlanmış, görselli bir dergiyle başla — sonra her
          sayfayı dilediğin gibi düzenle.
        </p>

        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {TEMPLATES.map((t) => {
            const theme = getTheme(t.themeKey);
            const isLoading = creating === t.key;
            return (
              <button
                key={t.key}
                onClick={() => create({ templateKey: t.key })}
                disabled={!!creating}
                className="group flex flex-col overflow-hidden rounded-2xl border border-amber-900/15 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
              >
                <div className="relative h-48 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.coverImage}
                    alt={t.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <div
                      className="text-2xl font-extrabold leading-none tracking-wide"
                      style={{ fontFamily: theme.fonts.display }}
                    >
                      {t.name}
                    </div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/80">
                      {t.issue}
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <p className="text-xs text-amber-900/70">{t.description}</p>
                  <span className="mt-3 inline-block text-sm font-medium text-amber-700">
                    {isLoading ? "Oluşturuluyor…" : "Bu dergiyle başla →"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ---- Blank themes ---- */}
        <h2 className="mb-1 mt-12 text-lg font-bold text-amber-950">
          Ya da boş bir kitaptan başla
        </h2>
        <p className="mb-6 text-sm text-amber-900/60">
          Yalnızca temayı seç, içeriği sıfırdan oluştur.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          {THEME_LIST.map((theme) => {
            const cs = theme.style.coverStyle;
            const framed = cs !== "modern";
            return (
              <button
                key={theme.key}
                onClick={() => create({ themeKey: theme.key })}
                disabled={!!creating}
                className="group overflow-hidden rounded-2xl border border-amber-900/15 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
              >
                <div
                  className="relative flex h-40 items-center justify-center"
                  style={{
                    background: `linear-gradient(140deg, ${theme.colors.cover} 0%, ${theme.colors.cover} 45%, rgba(0,0,0,0.35) 100%)`,
                    color: theme.colors.coverText,
                  }}
                >
                  {framed ? (
                    <div
                      className="absolute inset-4 rounded-sm"
                      style={{ border: `2px solid ${theme.colors.coverAccent}` }}
                    />
                  ) : (
                    <div
                      className="absolute left-0 top-0 h-full w-1.5"
                      style={{ background: theme.colors.coverAccent }}
                    />
                  )}
                  <span
                    className="relative text-xl font-bold"
                    style={{ fontFamily: theme.fonts.display }}
                  >
                    {theme.name}
                  </span>
                </div>
                <div className="p-4">
                  <div className="font-semibold text-amber-950">{theme.name}</div>
                  <p className="text-sm text-amber-900/60">{theme.tagline}</p>
                  <span className="mt-3 inline-block text-sm font-medium text-amber-700">
                    {creating === theme.key ? "Oluşturuluyor…" : "Bu temayı seç →"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
