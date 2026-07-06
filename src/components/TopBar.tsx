"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listMyBooks } from "@/lib/api";
import { useAuth, logout } from "@/lib/owner";
import type { BookSummary } from "@/lib/types";

export default function TopBar({ activeBookId }: { activeBookId?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [books, setBooks] = useState<BookSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const name = user?.name ?? "";

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function toggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      setLoading(true);
      try {
        setBooks(await listMyBooks());
      } catch {
        setBooks([]);
      } finally {
        setLoading(false);
      }
    }
  }

  async function signOut() {
    await logout();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-amber-900/10 bg-[#f7f1e6]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl">📖</span>
          <span className="font-semibold tracking-tight text-amber-950">
            Flipbook
          </span>
        </Link>

        <div className="flex items-center gap-3" ref={menuRef}>
          <div className="relative">
            <button
              onClick={toggle}
              className="flex items-center gap-1 rounded-lg border border-amber-900/20 bg-white px-3 py-1.5 text-sm font-medium text-amber-950 shadow-sm hover:bg-amber-50"
            >
              Kitaplarım
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`transition-transform ${open ? "rotate-180" : ""}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-xl border border-amber-900/15 bg-white shadow-xl">
                <Link
                  href="/new"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 text-sm font-medium text-amber-800 hover:bg-amber-50"
                >
                  <span className="text-lg leading-none">＋</span> Yeni Kitap
                </Link>

                <div className="max-h-80 overflow-y-auto">
                  {loading && (
                    <div className="px-4 py-3 text-sm text-gray-400">
                      Yükleniyor…
                    </div>
                  )}
                  {!loading && books && books.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      Henüz kitabın yok.
                    </div>
                  )}
                  {!loading &&
                    books &&
                    books.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          setOpen(false);
                          router.push(`/editor/${b.id}`);
                        }}
                        className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-amber-50 ${
                          activeBookId === b.id ? "bg-amber-50" : ""
                        }`}
                      >
                        <span className="truncate text-gray-800">
                          {b.title || "Adsız kitap"}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            b.status === "published"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {b.status === "published" ? "Yayında" : "Taslak"}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {user && (
            <button
              onClick={signOut}
              title={`${user.email} — çıkış yap`}
              className="hidden items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-amber-900/80 hover:bg-amber-100 sm:flex"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-700 text-xs font-bold text-white">
                {(user.name || user.email).slice(0, 1).toUpperCase()}
              </span>
              {user.name}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
