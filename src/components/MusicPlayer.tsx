"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/LangProvider";
import type { MusicTrack } from "@/lib/types";

export default function MusicPlayer({ tracks }: { tracks: MusicTrack[] }) {
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

  if (tracks.length === 0) return null;
  const track = tracks[index];

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }

  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 sm:bottom-auto sm:left-auto sm:right-4 sm:top-16 sm:translate-x-0">
      <audio
        ref={audioRef}
        src={track.url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={next}
      />
      <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/55 px-4 py-2 text-white shadow-xl backdrop-blur">
        <span className="text-sm" aria-hidden>
          🎵
        </span>
        <button
          onClick={prev}
          disabled={tracks.length < 2}
          title={t.ed.prevTrack}
          className="text-lg leading-none opacity-90 hover:opacity-100 disabled:opacity-30"
        >
          ⏮
        </button>
        <button
          onClick={toggle}
          title={playing ? t.ed.pause : t.ed.play}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
        >
          {playing ? "⏸" : "▶"}
        </button>
        <button
          onClick={next}
          disabled={tracks.length < 2}
          title={t.ed.nextTrack}
          className="text-lg leading-none opacity-90 hover:opacity-100 disabled:opacity-30"
        >
          ⏭
        </button>
        <div className="max-w-[9rem] truncate text-xs text-white/85 sm:max-w-[14rem]">
          {track.title}
        </div>
      </div>
    </div>
  );
}
