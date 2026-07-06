"use client";

import { useRef, useState } from "react";
import { uploadAudio } from "@/lib/api";
import { genId } from "@/lib/ids";
import { MUSIC_LIBRARY } from "@/lib/musicLibrary";
import type { MusicTrack } from "@/lib/types";

export default function MusicEditor({
  music,
  onChange,
  onCommit,
}: {
  music: MusicTrack[];
  onChange: (music: MusicTrack[]) => void;
  onCommit: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const has = (url: string) => music.some((m) => m.url === url);

  function addLib(t: MusicTrack) {
    if (has(t.url)) return;
    onChange([...music, { id: genId("m_"), title: t.title, url: t.url }]);
    onCommit();
  }
  function remove(id: string) {
    onChange(music.filter((m) => m.id !== id));
    onCommit();
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= music.length) return;
    const next = music.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    onCommit();
  }
  async function upload(file?: File | null) {
    if (!file || !file.type.startsWith("audio/")) return;
    setUploading(true);
    try {
      const { url } = await uploadAudio(file);
      onChange([
        ...music,
        { id: genId("m_"), title: file.name.replace(/\.[^.]+$/, ""), url },
      ]);
      onCommit();
    } catch {
      /* ignore */
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border-t border-amber-900/10 pt-4">
      <h3 className="text-sm font-semibold text-amber-950">
        🎵 Arka plan müziği
      </h3>
      <p className="mb-3 text-xs text-amber-900/55">
        Kitabı okuyanlar bu çalma listesini dinleyebilir (çal/durdur, ileri/geri).
      </p>

      {/* current playlist */}
      {music.length > 0 && (
        <ul className="mb-3 flex flex-col gap-1.5">
          {music.map((m, i) => (
            <li
              key={m.id}
              className="flex items-center gap-2 rounded-lg border border-amber-900/10 bg-white px-2 py-1.5"
            >
              <span className="text-xs text-amber-900/40">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                {m.title}
              </span>
              <div className="flex flex-col leading-none">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="text-[10px] text-gray-400 disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === music.length - 1}
                  className="text-[10px] text-gray-400 disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
              <button
                onClick={() => remove(m.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Sil
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* library */}
      <div className="mb-2 text-xs font-medium text-amber-900/70">
        Hazır parçalar
      </div>
      <div className="mb-3 flex flex-col gap-1.5">
        {MUSIC_LIBRARY.map((t) => (
          <button
            key={t.id}
            onClick={() => addLib(t)}
            disabled={has(t.url)}
            className="flex items-center justify-between rounded-lg border border-amber-900/15 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-amber-50 disabled:opacity-50"
          >
            <span className="truncate">{t.title}</span>
            <span className="shrink-0 text-xs font-medium text-amber-700">
              {has(t.url) ? "✓ eklendi" : "+ Ekle"}
            </span>
          </button>
        ))}
      </div>

      {/* upload own */}
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0])}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-lg border border-dashed border-amber-700/50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-50"
      >
        {uploading ? "Yükleniyor…" : "🎧 Kendi müziğini yükle (MP3…)"}
      </button>
    </div>
  );
}
