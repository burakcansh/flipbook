"use client";

import { useEffect, useState } from "react";
import BookFace, { type FaceContent } from "./BookFace";
import type { Theme } from "@/lib/themes";

export default function LivePreview({
  content,
  theme,
  label,
  editable,
  onImageMove,
  onImageResize,
  onTextMove,
  onTextResize,
  onCaptionMove,
  onVideoMove,
  onVideoResize,
  onLinkMove,
  onLinkResize,
  onCommit,
}: {
  content: FaceContent;
  theme: Theme;
  label: string;
  editable?: boolean;
  onImageMove?: (x: number, y: number) => void;
  onImageResize?: (size: number) => void;
  onTextMove?: (id: string, x: number, y: number) => void;
  onTextResize?: (id: string, w: number) => void;
  onCaptionMove?: (x: number, y: number) => void;
  onVideoMove?: (x: number, y: number) => void;
  onVideoResize?: (size: number) => void;
  onLinkMove?: (id: string, x: number, y: number) => void;
  onLinkResize?: (id: string, size: number) => void;
  onCommit?: () => void;
}) {
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  const face = (
    <BookFace
      content={content}
      theme={theme}
      side="right"
      editable={editable}
      onImageMove={onImageMove}
      onImageResize={onImageResize}
      onTextMove={onTextMove}
      onTextResize={onTextResize}
      onCaptionMove={onCaptionMove}
      onVideoMove={onVideoMove}
      onVideoResize={onVideoResize}
      onLinkMove={onLinkMove}
      onLinkResize={onLinkResize}
      onCommit={onCommit}
    />
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full items-center justify-center gap-2">
        <span className="text-xs uppercase tracking-wider text-amber-900/50">
          {label}
        </span>
        <button
          onClick={() => setFull(true)}
          title="Tam ekran önizleme"
          aria-label="Tam ekran önizleme"
          className="rounded-md border border-amber-900/20 bg-white px-1.5 py-0.5 text-xs text-amber-800 hover:bg-amber-50"
        >
          ⛶
        </button>
      </div>

      <div className="w-full" style={{ maxWidth: 360, aspectRatio: "3 / 4" }}>
        <div
          className="h-full w-full overflow-hidden rounded-r-lg rounded-l-sm shadow-xl"
          style={{ border: "1px solid rgba(0,0,0,0.12)" }}
        >
          {face}
        </div>
      </div>

      {editable && (
        <span className="text-center text-[11px] text-amber-900/45">
          İçeriği sürükleyerek konumlandırabilirsin
        </span>
      )}

      {full && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setFull(false)}
        >
          <button
            onClick={() => setFull(false)}
            aria-label="Kapat"
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/10 text-xl text-white hover:bg-white/20"
          >
            ✕
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ height: "90vh", aspectRatio: "3 / 4", maxWidth: "96vw" }}
          >
            <div
              className="h-full w-full overflow-hidden rounded-r-xl rounded-l-md shadow-2xl"
              style={{ border: "1px solid rgba(0,0,0,0.2)" }}
            >
              {face}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
