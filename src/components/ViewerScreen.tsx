"use client";

import Link from "next/link";
import Flipbook from "./Flipbook";
import MusicPlayer from "./MusicPlayer";
import { getTheme } from "@/lib/themes";
import { isPageEmpty } from "@/lib/textBlocks";
import type { PublicBook } from "@/lib/types";

export default function ViewerScreen({ book }: { book: PublicBook }) {
  const theme = getTheme(book.themeKey);
  // Skip fully-empty pages so accidental blank sheets never show to readers.
  const pages = book.pages.filter((p) => !isPageEmpty(p));

  const bg =
    theme.key === "journal"
      ? `radial-gradient(120% 75% at 50% 28%, rgba(255,238,210,0.10) 0%, transparent 55%),
         radial-gradient(100% 90% at 50% 125%, rgba(0,0,0,0.55) 0%, transparent 60%),
         linear-gradient(180deg, #3a2b1e 0%, #241a11 45%, #130d07 100%)`
      : `radial-gradient(120% 75% at 50% 28%, rgba(200,222,255,0.10) 0%, transparent 55%),
         radial-gradient(100% 90% at 50% 125%, rgba(0,0,0,0.6) 0%, transparent 60%),
         linear-gradient(180deg, #273143 0%, #141b26 50%, #070b11 100%)`;

  return (
    <main
      className="relative min-h-screen overflow-x-hidden"
      style={{
        background: bg,
        // gallery-style vignette that darkens the edges
        boxShadow: "inset 0 0 240px 80px rgba(0,0,0,0.55)",
      }}
    >
      <div className="min-h-screen w-full">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="text-white/90">
            {book.cover.title && (
              <div
                className="text-lg font-semibold"
                style={{ fontFamily: theme.fonts.display }}
              >
                {book.cover.title}
              </div>
            )}
            {book.cover.subtitle && (
              <div className="text-sm text-white/50">{book.cover.subtitle}</div>
            )}
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10"
          >
            📖 NextviroPublish
          </Link>
        </header>

        <div className="mx-auto flex w-full flex-col items-center px-4 pb-10 pt-2">
          <Flipbook cover={book.cover} pages={pages} theme={theme} />
        </div>
      </div>

      {book.music && book.music.length > 0 && (
        <MusicPlayer tracks={book.music} />
      )}
    </main>
  );
}
