"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import { deleteBook, listMyBooks } from "@/lib/api";
import { useAuth } from "@/lib/owner";
import { getTheme } from "@/lib/themes";
import type { BookSummary } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth(true);
  const [books, setBooks] = useState<BookSummary[] | null>(null);
  const name = user?.name ?? "";

  useEffect(() => {
    if (!user) return;
    listMyBooks().then(setBooks).catch(() => setBooks([]));
  }, [user]);

  async function onDelete(id: string) {
    if (!confirm("Bu kitabı silmek istediğine emin misin?")) return;
    await deleteBook(id);
    setBooks((b) => (b ? b.filter((x) => x.id !== id) : b));
  }

  return (
    <div className="min-h-screen bg-[#efe6d2]">
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-950">
              Merhaba{name ? `, ${name}` : ""} 👋
            </h1>
            <p className="text-sm text-amber-900/60">Kitaplarını yönet.</p>
          </div>
          <Link
            href="/new"
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow hover:bg-amber-800"
          >
            ＋ Yeni Kitap
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
            <p className="text-amber-900/70">Henüz bir kitabın yok.</p>
            <Link
              href="/new"
              className="mt-4 inline-block rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
            >
              İlk kitabını oluştur
            </Link>
          </div>
        )}

        {books && books.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {books.map((b) => {
              const theme = getTheme(b.themeKey);
              return (
                <div
                  key={b.id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-amber-900/15 bg-white shadow-sm transition hover:shadow-md"
                >
                  <Link
                    href={`/editor/${b.id}`}
                    className="flex h-28 items-center justify-center px-4 text-center"
                    style={{
                      background: theme.colors.cover,
                      color: theme.colors.coverText,
                    }}
                  >
                    <span
                      className="line-clamp-3 text-sm font-semibold"
                      style={{ fontFamily: theme.fonts.display }}
                    >
                      {b.name || b.title || "Adsız kitap"}
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
                        {b.status === "published" ? "Yayında" : "Taslak"}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {theme.name}
                      </span>
                    </div>
                    <div className="mt-auto flex items-center gap-2">
                      <Link
                        href={`/editor/${b.id}`}
                        className="flex-1 rounded-md border border-amber-700 px-2 py-1.5 text-center text-xs font-medium text-amber-800 hover:bg-amber-50"
                      >
                        Düzenle
                      </Link>
                      {b.status === "published" && b.slug && (
                        <Link
                          href={`/b/${b.slug}`}
                          target="_blank"
                          className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          Aç
                        </Link>
                      )}
                      <button
                        onClick={() => onDelete(b.id)}
                        className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
