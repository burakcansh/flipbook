"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/owner";
import { useT } from "@/lib/LangProvider";
import LangToggle from "@/components/LangToggle";
import Logo from "@/components/Logo";

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
    const slug = raw.replace(/^.*\/b\//, "").replace(/\/+$/, "");
    if (slug) router.push(`/b/${slug}`);
  }

  const features = [
    {
      icon: "📖",
      title: t.home.fBookTitle,
      desc: t.home.fBookDesc,
    },
    {
      icon: "🎓",
      title: t.home.fCertTitle,
      desc: t.home.fCertDesc,
    },
    {
      icon: "🌐",
      title: t.home.fSiteTitle,
      desc: t.home.fSiteDesc,
    },
  ];

  const commons = [
    { icon: "🔢", label: t.home.cCode },
    { icon: "🔗", label: t.home.cLink },
    { icon: "🔒", label: t.home.cPassword },
    { icon: "🎵", label: t.home.cMusic },
    { icon: "📱", label: t.home.cMobile },
    { icon: "🌍", label: t.home.cLang },
  ];

  const steps = [
    { n: "1", title: t.home.how1Title, desc: t.home.how1Desc },
    { n: "2", title: t.home.how2Title, desc: t.home.how2Desc },
    { n: "3", title: t.home.how3Title, desc: t.home.how3Desc },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#f6efdd] to-[#e6d6b4]">
      <div className="pointer-events-none absolute inset-0 paper-texture opacity-50" />

      {/* ---- nav ---- */}
      <header className="sticky top-0 z-30 border-b border-amber-900/10 bg-[#f6efdd]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <div className="flex items-center gap-2">
            <LangToggle />
            <button
              onClick={() => setShowLogin(true)}
              className="rounded-lg border border-amber-900/20 bg-white/70 px-3 py-1.5 text-sm font-medium text-amber-900 shadow-sm transition hover:bg-white"
            >
              {t.auth.signInButton}
            </button>
          </div>
        </div>
      </header>

      <div className="relative">
        {/* ---- hero ---- */}
        <section className="mx-auto max-w-6xl px-4 pb-6 pt-14 sm:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-700/30 bg-white/60 px-3 py-1 text-xs font-medium text-amber-800">
                📖 · 🎓 · 🌐
              </span>
              <h1
                className="mt-4 text-4xl font-bold leading-[1.1] text-amber-950 sm:text-5xl"
                style={{ fontFamily: "var(--font-display), Georgia, serif" }}
              >
                {t.home.heroTitle}
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base text-amber-900/70 lg:mx-0">
                {t.home.heroSub}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                {commons.slice(0, 4).map((c) => (
                  <span
                    key={c.label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-amber-900"
                  >
                    <span aria-hidden>{c.icon}</span>
                    {c.label}
                  </span>
                ))}
              </div>
            </div>

            {/* code entry — the hero action */}
            <form
              onSubmit={openCode}
              className="w-full rounded-2xl border border-amber-900/15 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-7"
            >
              <h2 className="text-center text-lg font-semibold text-amber-950">
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
                placeholder={t.auth.codePlaceholder}
                className="mt-5 w-full rounded-xl border border-amber-900/20 bg-white px-4 py-4 text-center text-3xl font-semibold tracking-[0.4em] text-amber-950 outline-none focus:border-amber-600"
              />
              {codeError && (
                <p className="mt-3 text-center text-sm text-red-600">
                  {codeError}
                </p>
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
        </section>

        {/* ---- features ---- */}
        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2
            className="text-center text-2xl font-bold text-amber-950 sm:text-3xl"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            {t.home.featuresTitle}
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="flex flex-col rounded-2xl border border-amber-900/12 bg-white/85 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-3 text-lg font-semibold text-amber-950">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-amber-900/65">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- common features strip ---- */}
        <section className="mx-auto max-w-6xl px-4 pb-14">
          <div className="rounded-2xl border border-amber-900/12 bg-amber-900/[0.04] p-6 sm:p-8">
            <h3 className="text-center text-sm font-semibold uppercase tracking-wide text-amber-900/70">
              {t.home.commonTitle}
            </h3>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {commons.map((c) => (
                <div
                  key={c.label}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-white/70 px-3 py-4 text-center"
                >
                  <span className="text-2xl" aria-hidden>
                    {c.icon}
                  </span>
                  <span className="text-xs font-medium text-amber-900/80">
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- how it works ---- */}
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2
            className="text-center text-2xl font-bold text-amber-950 sm:text-3xl"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            {t.home.howTitle}
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-amber-900/12 bg-white/85 p-6 shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-700 text-sm font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-amber-950">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-amber-900/65">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- CTA ---- */}
        <section className="mx-auto max-w-3xl px-4 pb-16 text-center">
          <div className="rounded-2xl border border-amber-700/25 bg-gradient-to-br from-amber-50 to-white p-8 shadow-sm">
            <h2
              className="text-2xl font-bold text-amber-950"
              style={{ fontFamily: "var(--font-display), Georgia, serif" }}
            >
              {t.home.ctaTitle}
            </h2>
            <button
              onClick={() => setShowLogin(true)}
              className="mt-5 inline-block rounded-xl bg-amber-700 px-6 py-3 text-base font-medium text-white shadow transition hover:bg-amber-800"
            >
              {t.home.ctaButton} →
            </button>
          </div>
        </section>

        {/* ---- footer ---- */}
        <footer className="border-t border-amber-900/10 bg-[#f6efdd]/60">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row">
            <Logo size={26} />
            <div className="flex flex-col items-center gap-0.5 text-xs text-amber-900/50 sm:items-end">
              <span>
                {t.home.founder} · <span className="font-medium text-amber-900/70">Burak Sarıkaya</span>
              </span>
              <span>
                © {new Date().getFullYear()} {t.home.footer}
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* ---- login modal ---- */}
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
