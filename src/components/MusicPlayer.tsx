"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/LangProvider";
import type { MusicTrack } from "@/lib/types";

export default function MusicPlayer({
  tracks,
  autoPlay = false,
  variant = "book",
}: {
  tracks: MusicTrack[];
  /** try to start playing as soon as the page opens */
  autoPlay?: boolean;
  /** "site" = compact pill pinned to the top-right corner */
  variant?: "book" | "site";
}) {
  const t = useT();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const next = () => setIndex((i) => (i + 1) % tracks.length);
  const prev = () => setIndex((i) => (i - 1 + tracks.length) % tracks.length);

  // When the track changes while playing, continue with the new one.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.play().catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Autoplay on open. Browsers block sound-on autoplay without a prior user
  // gesture, so if the first attempt is rejected we start on the first
  // interaction anywhere on the page.
  useEffect(() => {
    if (!autoPlay || tracks.length === 0) return;
    const a = audioRef.current;
    if (!a) return;
    let armed = false;
    const start = () => {
      a.play().catch(() => {});
      cleanup();
    };
    const cleanup = () => {
      if (!armed) return;
      armed = false;
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      window.removeEventListener("touchstart", start);
    };
    a.play().catch(() => {
      armed = true;
      window.addEventListener("pointerdown", start, { once: true });
      window.addEventListener("keydown", start, { once: true });
      window.addEventListener("touchstart", start, { once: true });
    });
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (tracks.length === 0) return null;
  const track = tracks[index];

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }

  const site = variant === "site";

  return (
    <div
      className={
        site
          ? "fixed right-3 top-[38%] z-[2147483647] -translate-y-1/2"
          : "fixed bottom-5 left-1/2 z-50 -translate-x-1/2 sm:bottom-auto sm:left-auto sm:right-4 sm:top-16 sm:translate-x-0"
      }
    >
      <audio
        ref={audioRef}
        src={track.url}
        loop={tracks.length === 1}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={next}
      />
      <div
        className={`flex items-center rounded-full border border-white/15 bg-black/55 text-white shadow-xl backdrop-blur ${
          site ? "gap-1.5 px-2 py-1.5" : "gap-3 px-4 py-2"
        }`}
      >
        {!site && (
          <span className="text-sm" aria-hidden>
            🎵
          </span>
        )}
        {tracks.length > 1 && (
          <button
            onClick={prev}
            title={t.ed.prevTrack}
            className={`leading-none opacity-90 hover:opacity-100 ${
              site ? "text-sm" : "text-lg"
            }`}
          >
            ⏮
          </button>
        )}
        <button
          onClick={toggle}
          title={playing ? t.ed.pause : t.ed.play}
          className={`flex items-center justify-center rounded-full bg-white text-black transition hover:scale-105 ${
            site ? "h-7 w-7 text-xs" : "h-9 w-9"
          }`}
        >
          {playing ? "⏸" : "▶"}
        </button>
        {tracks.length > 1 && (
          <button
            onClick={next}
            title={t.ed.nextTrack}
            className={`leading-none opacity-90 hover:opacity-100 ${
              site ? "text-sm" : "text-lg"
            }`}
          >
            ⏭
          </button>
        )}
        {!site && (
          <div className="max-w-[9rem] truncate text-xs text-white/85 sm:max-w-[14rem]">
            {track.title}
          </div>
        )}
      </div>
    </div>
  );
}
