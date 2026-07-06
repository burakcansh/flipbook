import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#efe6d2] px-6 text-center">
      <div className="text-5xl">📭</div>
      <h1 className="mt-4 text-2xl font-bold text-amber-950">
        Burada bir kitap yok
      </h1>
      <p className="mt-2 text-amber-900/60">
        Aradığın sayfa bulunamadı ya da kitap henüz yayında değil.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
      >
        Ana sayfaya dön
      </Link>
    </main>
  );
}
