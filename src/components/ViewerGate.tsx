"use client";

import { useState } from "react";
import ViewerScreen from "./ViewerScreen";
import SiteViewer from "./SiteViewer";
import { getTheme } from "@/lib/themes";
import { useT } from "@/lib/LangProvider";
import type { PublicBook, ThemeKey } from "@/lib/types";

export default function ViewerGate({
  slug,
  title,
  themeKey,
}: {
  slug: string;
  title: string;
  themeKey: ThemeKey;
}) {
  const [password, setPassword] = useState("");
  const [book, setBook] = useState<PublicBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useT();
  const theme = getTheme(themeKey);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/${slug}?t=${Date.now()}`, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 401) {
        setError(t.gate.wrong);
        setBusy(false);
        return;
      }
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { book: PublicBook };
      setBook(data.book);
    } catch {
      setError(t.gate.error);
      setBusy(false);
    }
  }

  if (book) {
    if (book.cover.docType === "site")
      return <SiteViewer src={`/b/${slug}/raw`} music={book.music ?? []} />;
    return <ViewerScreen book={book} />;
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6"
      style={{
        background:
          theme.key === "corporate" || theme.key === "midnight"
            ? "radial-gradient(circle at 50% -10%, #243044 0%, #0f1726 60%, #080d16 100%)"
            : "radial-gradient(circle at 50% -10%, #5b3a24 0%, #2a1a0f 55%, #1a1009 100%)",
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-black/40 p-7 text-center backdrop-blur"
      >
        <div className="mb-2 text-4xl">🔒</div>
        {title && (
          <h1
            className="text-xl font-semibold text-white"
            style={{ fontFamily: theme.fonts.display }}
          >
            {title}
          </h1>
        )}
        <p className="mt-1 text-sm text-white/60">{t.gate.protected}</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.gate.passwordPlaceholder}
          autoFocus
          className="mt-5 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-center text-white placeholder-white/40 outline-none focus:border-white/50"
        />
        {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={busy || !password}
          className="mt-4 w-full rounded-lg bg-white px-4 py-2.5 font-medium text-gray-900 transition hover:bg-white/90 disabled:opacity-50"
        >
          {busy ? t.gate.checking : t.gate.open}
        </button>
      </form>
    </main>
  );
}
