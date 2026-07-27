"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import { deleteBook, listMyBooks } from "@/lib/api";
import { useAuth } from "@/lib/owner";
import { getTheme } from "@/lib/themes";
import { useT } from "@/lib/LangProvider";
import type { BookSummary, DocType } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth(true);
  const t = useT();
  const [books, setBooks] = useState<BookSummary[] | null>(null);
  const name = user?.name ?? "";

  useEffect(() => {
    if (!user) return;
    listMyBooks().then(setBooks).catch(() => setBooks([]));
  }, [user]);

  async function onDelete(id: string) {
    if (!confirm(t.dashboard.confirmDelete)) return;
    await deleteBook(id);
    setBooks((b) => (b ? b.filter((x) => x.id !== id) : b));
  }

  function typeMeta(dt: DocType) {
    if (dt === "site") return { icon: "🌐", label: t.common.typeSite };
    if (dt === "certificate")
      return { icon: "🎓", label: t.common.typeCertificate };
    return { icon: "📖", label: t.common.typeBook };
  }

  function renderCard(b: BookSummary) {
    const theme = getTheme(b.themeKey);
    const type = typeMeta(b.docType);
    return (
      <div
        key={b.id}
        className="group flex flex-col overflow-hidden rounded-xl border border-amber-900/15 bg-white shadow-sm transition hover:shadow-md"
      >
        <Link
          href={`/editor/${b.id}`}
          className="relative flex h-28 items-center justify-center px-4 text-center"
          style={{
            background: theme.colors.cover,
            color: theme.colors.coverText,
          }}
        >
          {b.locked && (
            <span
              title={t.ed.protect}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/45 text-xs text-white backdrop-blur"
            >
              🔒
            </span>
          )}
          <span
            className="line-clamp-3 text-sm font-semibold"
            style={{ fontFamily: theme.fonts.display }}
          >
            {b.name || b.title || t.common.untitledBook}
          </span>
        </Link>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                b.status === "published"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {b.status === "published" ? t.common.published : t.common.draft}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/70 px-2 py-0.5 text-[11px] font-medium text-amber-900">
              <span aria-hidden>{type.icon}</span>
              {type.label}
            </span>
          </div>

          {b.note.trim() && (
            <div className="note-glow flex items-start gap-1.5 rounded-lg border border-amber-300 bg-white px-2 py-1.5">
              <span className="note-dot mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span className="line-clamp-2 text-[11px] leading-snug text-amber-950">
                {b.note}
              </span>
            </div>
          )}
          <div className="mt-auto flex items-center gap-2">
            <Link
              href={`/editor/${b.id}`}
              className="flex-1 rounded-md border border-amber-700 px-2 py-1.5 text-center text-xs font-medium text-amber-800 hover:bg-amber-50"
            >
              {t.common.edit}
            </Link>
            {b.status === "published" && b.slug && (
              <Link
                href={`/b/${b.slug}`}
                target="_blank"
                className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                {t.common.open}
              </Link>
            )}
            <button
              onClick={() => onDelete(b.id)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50"
            >
              {t.common.delete}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#efe6d2]">
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-950">
              {t.dashboard.greeting(name)}
            </h1>
            <p className="text-sm text-amber-900/60">{t.dashboard.subtitle}</p>
          </div>
          <Link
            href="/new"
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow hover:bg-amber-800"
          >
            {t.dashboard.newBook}
          </Link>
        </div>

        {books === null && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-44 rounded-xl" />
            ))}
          </div>
        )}

        {books && books.length === 0 && (
          <div className="rounded-2xl border border-dashed border-amber-900/30 bg-white/40 px-6 py-16 text-center">
            <div className="mb-3 text-4xl">📚</div>
            <p className="text-amber-900/70">{t.dashboard.empty}</p>
            <Link
              href="/new"
              className="mt-4 inline-block rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              {t.dashboard.createFirst}
            </Link>
          </div>
        )}

        {books && books.length > 0 && (
          <div className="flex flex-col gap-8">
            {(
              [
                { key: "published", label: t.dashboard.publishedSection },
                { key: "draft", label: t.dashboard.draftSection },
              ] as const
            ).map((group) => {
              const items = books.filter((b) =>
                group.key === "published"
                  ? b.status === "published"
                  : b.status !== "published"
              );
              if (items.length === 0) return null;
              return (
                <section key={group.key}>
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        group.key === "published"
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    />
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-900/70">
                      {group.label}
                    </h2>
                    <span className="text-xs text-amber-900/40">
                      ({items.length})
                    </span>
                    <span className="ml-2 h-px flex-1 bg-amber-900/10" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {items.map((b) => renderCard(b))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
