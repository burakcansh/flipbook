"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/owner";

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız.");
      setBusy(false);
    }
  }

  function openCode(e: React.FormEvent) {
    e.preventDefault();
    const slug = code.trim().replace(/^.*\/b\//, "").replace(/\/+$/, "");
    if (!slug) return;
    router.push(`/b/${slug}`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#f3e9d2] to-[#e6d6b4]">
      <div className="pointer-events-none absolute inset-0 paper-texture opacity-60" />
      <div className="relative mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16">
        <div className="mb-2 text-5xl">📖</div>
        <h1
          className="text-center text-4xl font-bold text-amber-950 sm:text-5xl"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Flipbook
        </h1>
        <p className="mt-3 max-w-md text-center text-amber-900/70">
          Gerçekçi sayfa çevirme animasyonuyla dijital kitap ve dergi oluştur,
          tek bir link ile paylaş.
        </p>

        <form
          onSubmit={submit}
          className="mt-10 w-full max-w-md rounded-2xl border border-amber-900/15 bg-white/80 p-6 shadow-lg backdrop-blur"
        >
          <label className="block text-sm font-medium text-amber-950">
            E-posta
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@mail.com"
            autoComplete="email"
            autoFocus
            className="mt-2 w-full rounded-lg border border-amber-900/20 bg-white px-4 py-2.5 text-amber-950 outline-none focus:border-amber-600"
          />

          <label className="mt-4 block text-sm font-medium text-amber-950">
            Şifre
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className="mt-2 w-full rounded-lg border border-amber-900/20 bg-white px-4 py-2.5 text-amber-950 outline-none focus:border-amber-600"
          />

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy || !email.trim() || password.length < 4}
            className="mt-5 w-full rounded-lg bg-amber-700 px-4 py-2.5 font-medium text-white shadow transition hover:bg-amber-800 disabled:opacity-50"
          >
            {busy ? "Giriş yapılıyor…" : "Giriş yap →"}
          </button>
          <p className="mt-2 text-center text-xs text-amber-900/50">
            Bu sisteme yalnızca yetkili hesap giriş yapabilir.
          </p>
        </form>

        <form
          onSubmit={openCode}
          className="mt-6 w-full max-w-md rounded-2xl border border-amber-900/10 bg-white/50 p-5"
        >
          <label className="block text-sm font-medium text-amber-950/80">
            Elimde bir paylaşım kodu var
          </label>
          <div className="mt-2 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="örn. ab12cd34"
              className="min-w-0 flex-1 rounded-lg border border-amber-900/20 bg-white px-3 py-2 text-amber-950 outline-none focus:border-amber-600"
            />
            <button
              type="submit"
              disabled={!code.trim()}
              className="shrink-0 rounded-lg border border-amber-700 px-4 py-2 font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
            >
              Görüntüle
            </button>
          </div>
          <p className="mt-2 text-xs text-amber-900/50">
            Giriş yapmadan da bir kitabı görüntüleyebilirsin.
          </p>
        </form>
      </div>
    </main>
  );
}
