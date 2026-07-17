"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/owner";
import { useT } from "@/lib/LangProvider";
import LangToggle from "@/components/LangToggle";

export default function LandingPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.signInFailed);
      setBusy(false);
    }
  }

  async function openCode(e: React.FormEvent) {
    e.preventDefault();
    setCodeError(null);
    const raw = code.trim();
    // 5-digit share code → resolve to the book's link.
    if (/^\d{5}$/.test(raw)) {
      setCodeBusy(true);
      try {
        const res = await fetch(`/api/code/${raw}`, { cache: "no-store" });
        if (res.ok) {
          const { slug } = (await res.json()) as { slug: string };
          router.push(`/b/${slug}`);
          return;
        }
        setCodeError(t.auth.codeNotFound);
      } catch {
        setCodeError(t.auth.codeError);
      } finally {
        setCodeBusy(false);
      }
      return;
    }
    // Fallback: pasted a full /b/ link or slug.
    const slug = raw.replace(/^.*\/b\//, "").replace(/\/+$/, "");
    if (slug) router.push(`/b/${slug}`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#f3e9d2] to-[#e6d6b4]">
      <div className="pointer-events-none absolute inset-0 paper-texture opacity-60" />

      {/* top-right: language + small sign-in button */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <LangToggle />
        <button
          onClick={() => setShowLogin(true)}
          className="rounded-lg border border-amber-900/20 bg-white/70 px-3 py-1.5 text-sm font-medium text-amber-900 shadow-sm backdrop-blur transition hover:bg-white"
        >
          {t.auth.signInButton}
        </button>
      </div>

      {/* center: book-code entry as the hero */}
      <div className="relative mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 py-16">
        <div className="mb-2 text-5xl">📖</div>
        <h1
          className="text-center text-4xl font-bold text-amber-950 sm:text-5xl"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Flipbook
        </h1>

        <form
          onSubmit={openCode}
          className="mt-10 w-full rounded-2xl border border-amber-900/15 bg-white/85 p-7 shadow-xl backdrop-blur"
        >
          <h2 className="text-center text-xl font-semibold text-amber-950">
            {t.auth.codeHeading}
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-center text-sm text-amber-900/60">
            {t.auth.codeSub}
          </p>

          <input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 5))
            }
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={5}
            autoFocus
            placeholder={t.auth.codePlaceholder}
            className="mt-6 w-full rounded-xl border border-amber-900/20 bg-white px-4 py-4 text-center text-3xl font-semibold tracking-[0.4em] text-amber-950 outline-none focus:border-amber-600"
          />

          {codeError && (
            <p className="mt-3 text-center text-sm text-red-600">{codeError}</p>
          )}

          <button
            type="submit"
            disabled={code.length !== 5 || codeBusy}
            className="mt-5 w-full rounded-xl bg-amber-700 px-4 py-3 text-lg font-medium text-white shadow transition hover:bg-amber-800 disabled:opacity-50"
          >
            {codeBusy ? "…" : t.auth.codeView}
          </button>
          <p className="mt-3 text-center text-xs text-amber-900/50">
            {t.auth.codeHint}
          </p>
        </form>
      </div>

      {/* login modal (opened from the small top-right button) */}
      {showLogin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowLogin(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-amber-900/15 bg-white p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setShowLogin(false)}
              aria-label={t.common.cancel}
              className="absolute right-3 top-3 text-amber-900/40 hover:text-amber-900"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold text-amber-950">
              {t.auth.signInTitle}
            </h2>

            <label className="mt-4 block text-sm font-medium text-amber-950">
              {t.auth.emailLabel}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.auth.emailPlaceholder}
              autoComplete="email"
              autoFocus
              className="mt-2 w-full rounded-lg border border-amber-900/20 bg-white px-4 py-2.5 text-amber-950 outline-none focus:border-amber-600"
            />

            <label className="mt-4 block text-sm font-medium text-amber-950">
              {t.auth.passwordLabel}
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
              {busy ? t.auth.signingIn : t.auth.signIn}
            </button>
            <p className="mt-2 text-center text-xs text-amber-900/50">
              {t.auth.onlyAdmin}
            </p>
          </form>
        </div>
      )}
    </main>
  );
}
