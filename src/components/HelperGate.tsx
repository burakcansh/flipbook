"use client";

import { useState } from "react";
import { useT } from "@/lib/LangProvider";
import SiteViewer from "./SiteViewer";

/** Password gate for a helper file preview; on success renders the document. */
export default function HelperGate({
  bid,
  fid,
  title,
}: {
  bid: string;
  fid: string;
  title: string;
}) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/helper/${bid}/${fid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 401) {
        setError(t.gate.wrong);
        setBusy(false);
        return;
      }
      if (!res.ok) throw new Error();
      setUnlocked(true);
    } catch {
      setError(t.gate.error);
      setBusy(false);
    }
  }

  if (unlocked) return <SiteViewer src={`/h/${bid}/${fid}/raw`} />;

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6"
      style={{
        background:
          "radial-gradient(circle at 50% -10%, #5b3a24 0%, #2a1a0f 55%, #1a1009 100%)",
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-black/40 p-7 text-center backdrop-blur"
      >
        <div className="mb-2 text-4xl">🔒</div>
        {title && (
          <h1 className="text-xl font-semibold text-white">{title}</h1>
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
