"use client";

import { useRef, useState } from "react";
import { fetchVideoMeta, uploadImage, uploadVideo } from "@/lib/api";
import { pdfToJpegBlobs } from "@/lib/pdfToImages";
import { genId } from "@/lib/ids";
import { FONT_OPTIONS } from "@/lib/fonts";
import { BG_LIBRARY } from "@/lib/backgrounds";
import { SOCIAL_LIST, SocialIcon } from "@/lib/socialIcons";
import { getTextBlocks } from "@/lib/textBlocks";
import { useT } from "@/lib/LangProvider";
import type {
  BookPage,
  ImageAlign,
  ImageMeta,
  LinkItem,
  LinkPlatform,
  TextBlock,
} from "@/lib/types";

function normalizeUrl(u: string): string {
  const t = u.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/* ---------------- Text blocks editor (multiple, styled) -------------------- */

function TextBlockRow({
  block,
  onUpdate,
  onCommit,
  onRemove,
  canRemove,
}: {
  block: TextBlock;
  onUpdate: (patch: Partial<TextBlock>) => void;
  onCommit: () => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const t = useT();
  const ref = useRef<HTMLTextAreaElement | null>(null);

  function wrap(mark: string) {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    if (s === e) return;
    const val = block.body;
    const next = val.slice(0, s) + mark + val.slice(s, e) + mark + val.slice(e);
    onUpdate({ body: next });
    onCommit();
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + mark.length, e + mark.length);
    });
  }

  return (
    <div className="rounded-lg border border-amber-900/15 bg-white p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex gap-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => wrap("**")}
            title={t.ed.bold}
            className="h-6 w-6 rounded border border-amber-900/20 text-sm font-bold text-amber-900 hover:bg-amber-50"
          >
            B
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => wrap("_")}
            title={t.ed.italic}
            className="h-6 w-6 rounded border border-amber-900/20 text-sm italic text-amber-900 hover:bg-amber-50"
          >
            I
          </button>
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-xs text-red-400 hover:text-red-600"
          >
            {t.ed.delete}
          </button>
        )}
      </div>
      <textarea
        ref={ref}
        value={block.body}
        onChange={(e) => onUpdate({ body: e.target.value })}
        onBlur={onCommit}
        rows={4}
        placeholder={t.ed.textPh}
        className="w-full resize-y rounded-lg border border-amber-900/20 bg-white px-3 py-2 leading-relaxed outline-none focus:border-amber-600"
      />
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <div className="min-w-[8rem] flex-1">
          <label className="mb-1 block text-[11px] font-medium text-amber-900/70">
            {t.ed.font}
          </label>
          <select
            value={block.fontFamily ?? ""}
            onChange={(e) => {
              onUpdate({ fontFamily: e.target.value });
              onCommit();
            }}
            className="w-full rounded-lg border border-amber-900/20 bg-white px-2 py-1.5 text-sm outline-none focus:border-amber-600"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.key} value={f.css}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-24">
          <label className="mb-1 flex items-center justify-between text-[11px] font-medium text-amber-900/70">
            <span>{t.ed.size}</span>
            <span className="text-amber-900/50">{block.fontSize || 15}</span>
          </label>
          <input
            type="range"
            min={3}
            max={40}
            value={block.fontSize || 15}
            onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
            onPointerUp={onCommit}
            className="w-full accent-amber-700"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-amber-900/70">
            {t.ed.color}
          </label>
          <input
            type="color"
            value={block.color || "#3b2f24"}
            onChange={(e) => onUpdate({ color: e.target.value })}
            onBlur={onCommit}
            className="h-8 w-10 cursor-pointer rounded border border-amber-900/20 bg-white"
          />
        </div>
      </div>
    </div>
  );
}

function TextBlocksEditor({
  page,
  onChange,
  onCommit,
}: {
  page: BookPage;
  onChange: (patch: Partial<BookPage>) => void;
  onCommit: () => void;
}) {
  const t = useT();
  const blocks = getTextBlocks(page);

  const write = (next: TextBlock[]) =>
    onChange({
      texts: next,
      heading: undefined,
      body: undefined,
      textX: undefined,
      textY: undefined,
    });

  function add() {
    const nb: TextBlock = {
      id: genId("t_"),
      body: "",
      x: 6,
      y: Math.min(82, 6 + blocks.length * 12),
      w: 84,
      fontSize: 15,
    };
    write([...blocks, nb]);
    onCommit();
  }
  function update(id: string, patch: Partial<TextBlock>) {
    write(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function remove(id: string) {
    write(blocks.filter((b) => b.id !== id));
    onCommit();
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-amber-950">{t.ed.textBlocks}</h3>
      {blocks.map((b) => (
        <TextBlockRow
          key={b.id}
          block={b}
          onUpdate={(patch) => update(b.id, patch)}
          onCommit={onCommit}
          onRemove={() => remove(b.id)}
          canRemove={blocks.length > 0}
        />
      ))}
      <button
        onClick={add}
        className="rounded-lg border border-dashed border-amber-700/50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50"
      >
        {t.ed.addText}
      </button>
    </div>
  );
}

/* ---------------- Image editor (drag&drop, gallery, drag-to-resize) -------- */

function ImageEditor({
  page,
  onChange,
  onCommit,
}: {
  page: BookPage;
  onChange: (patch: Partial<BookPage>) => void;
  onCommit: () => void;
}) {
  const t = useT();
  const im = page.image ?? null;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const resizeRef = useRef<{ startX: number; startScale: number } | null>(null);

  function patchImage(patch: Partial<ImageMeta>) {
    const base: ImageMeta = im ?? { src: "", alt: "", scale: 0.8, align: "center" };
    onChange({ image: { ...base, ...patch } });
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = Array.from(files).find((f) => f.type.startsWith("image/"));
    if (!file) {
      setError(t.ed.pickImage);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadImage(file);
      onChange({
        image: {
          src: url,
          alt: im?.alt ?? "",
          scale: im?.scale ?? 0.8,
          align: im?.align ?? "center",
        },
      });
      onCommit();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.ed.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  // drag-to-resize via the corner handle
  function onResizeDown(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startScale: im?.scale ?? 0.8 };
  }
  function onResizeMove(e: React.PointerEvent) {
    const r = resizeRef.current;
    if (!r || !boxRef.current) return;
    const w = boxRef.current.getBoundingClientRect().width || 1;
    const next = r.startScale + (e.clientX - r.startX) / w;
    patchImage({ scale: Math.max(0.2, Math.min(1, next)) });
  }
  function onResizeUp(e: React.PointerEvent) {
    if (!resizeRef.current) return;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    resizeRef.current = null;
    onCommit();
  }

  const alignBtn = (a: ImageAlign, label: string) => (
    <button
      onClick={() => {
        patchImage({ align: a });
        onCommit();
      }}
      className={`flex-1 rounded-md px-2 py-1.5 text-sm transition ${
        (im?.align ?? "center") === a
          ? "bg-amber-700 text-white"
          : "text-amber-900/70 hover:bg-amber-100"
      }`}
    >
      {label}
    </button>
  );

  const justify =
    (im?.align ?? "center") === "left"
      ? "flex-start"
      : (im?.align ?? "center") === "right"
      ? "flex-end"
      : "center";

  return (
    <div className="flex flex-col gap-3">
      {/* drop zone / picker */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          dragActive
            ? "border-amber-600 bg-amber-50"
            : "border-amber-900/25 bg-white hover:bg-amber-50"
        }`}
      >
        <div className="text-2xl">🖼️</div>
        <p className="mt-1 text-sm font-medium text-amber-900">
          {uploading
            ? t.ed.uploading
            : im?.src
            ? t.ed.changeImage
            : t.ed.dropImage}
        </p>
        <p className="text-xs text-amber-900/50">{t.ed.imageFormats}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}

      {im?.src && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => {
                onChange({ image: null });
                onCommit();
              }}
              className="text-xs font-medium text-red-500 hover:text-red-600"
            >
              {t.ed.removeImage}
            </button>
          </div>
          {/* interactive preview with drag-to-resize handle */}
          <div
            ref={boxRef}
            className="rounded-lg border border-amber-900/15 bg-[repeating-conic-gradient(#f3eee2_0_25%,#fff_0_50%)] bg-[length:18px_18px] p-3"
          >
            <div className="flex" style={{ justifyContent: justify }}>
              <div
                className="relative"
                style={{ width: `${Math.round((im.scale || 0.8) * 100)}%` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={im.src}
                  alt={im.alt || ""}
                  draggable={false}
                  className="block w-full rounded-md shadow"
                />
                <span
                  onPointerDown={onResizeDown}
                  onPointerMove={onResizeMove}
                  onPointerUp={onResizeUp}
                  onPointerCancel={onResizeUp}
                  title={t.ed.dragResize}
                  className="absolute -bottom-2 -right-2 flex h-6 w-6 cursor-nwse-resize items-center justify-center rounded-full bg-amber-700 text-white shadow-md"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 22H2v-2h20v2zM22 2h-2v16h2V2zM2 2v16h2V2H2z" opacity="0" />
                    <path d="M21 15v6h-6l2.3-2.3-3.6-3.6 1.4-1.4 3.6 3.6L21 15zM9 3H3v6l2.3-2.3 3.6 3.6 1.4-1.4-3.6-3.6L9 3z" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          {/* scale slider */}
          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-amber-900/70">
              <span>{t.ed.size}</span>
              <span className="tabular-nums text-amber-900/50">
                %{Math.round((im.scale || 0.8) * 100)}
              </span>
            </label>
            <input
              type="range"
              min={20}
              max={100}
              value={Math.round((im.scale || 0.8) * 100)}
              onChange={(e) => patchImage({ scale: Number(e.target.value) / 100 })}
              onPointerUp={onCommit}
              onBlur={onCommit}
              className="w-full accent-amber-700"
            />
          </div>

          {/* alignment */}
          <div>
            <label className="mb-1 block text-xs font-medium text-amber-900/70">
              {t.ed.align}
            </label>
            <div className="flex gap-1 rounded-lg bg-amber-100/60 p-1">
              {alignBtn("left", t.ed.left)}
              {alignBtn("center", t.ed.center)}
              {alignBtn("right", t.ed.right)}
            </div>
          </div>
        </>
      )}

      {/* caption */}
      <div>
        <label className="mb-1 block text-xs font-medium text-amber-900/70">
          {t.ed.caption}
        </label>
        <input
          value={page.caption ?? ""}
          onChange={(e) => onChange({ caption: e.target.value })}
          onBlur={onCommit}
          placeholder={t.ed.captionPh}
          className="w-full rounded-lg border border-amber-900/20 bg-white px-3 py-2 outline-none focus:border-amber-600"
        />
      </div>
    </div>
  );
}

/* ---------------- Page background editor ----------------------------------- */

/* ---------------- Video editor (link, upload, size) ------------------------ */

function VideoEditor({
  page,
  onChange,
  onCommit,
}: {
  page: BookPage;
  onChange: (patch: Partial<BookPage>) => void;
  onCommit: () => void;
}) {
  const t = useT();
  const [videoUrl, setVideoUrl] = useState(page.video?.url ?? "");
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const keepScale = () => page.video?.scale ?? 0.7;

  async function loadMeta() {
    const url = videoUrl.trim();
    if (!url) return;
    setLoadingMeta(true);
    setMetaError(null);
    try {
      const meta = await fetchVideoMeta(url);
      if (!meta) {
        setMetaError(t.ed.videoLinkFailed);
        onChange({ video: null });
      } else {
        onChange({ video: { ...meta, scale: keepScale() } });
      }
    } catch {
      setMetaError(t.ed.errorGeneric);
    } finally {
      setLoadingMeta(false);
      onCommit();
    }
  }

  async function handleFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setUploadErr(t.ed.pickVideo);
      return;
    }
    setUploading(true);
    setUploadErr(null);
    try {
      const { url } = await uploadVideo(file);
      onChange({
        video: {
          provider: "local",
          url,
          title: file.name.replace(/\.[^.]+$/, ""),
          thumbnail: "",
          scale: keepScale(),
        },
      });
      onCommit();
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : t.ed.videoUploadFailed);
    } finally {
      setUploading(false);
    }
  }

  const v = page.video;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-amber-900/70">
          {t.ed.videoLink}
        </label>
        <div className="flex gap-2">
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") loadMeta();
            }}
            placeholder="https://youtube.com/watch?v=…"
            className="min-w-0 flex-1 rounded-lg border border-amber-900/20 bg-white px-3 py-2 outline-none focus:border-amber-600"
          />
          <button
            onClick={loadMeta}
            disabled={loadingMeta || !videoUrl.trim()}
            className="shrink-0 rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {loadingMeta ? "…" : t.ed.fetch}
          </button>
        </div>
        {metaError && <p className="mt-1 text-xs text-red-500">{metaError}</p>}
      </div>

      <div className="flex items-center gap-3 text-xs text-amber-900/40">
        <span className="h-px flex-1 bg-amber-900/15" />
        {t.ed.orUploadDevice}
        <span className="h-px flex-1 bg-amber-900/15" />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => fileRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-900/25 bg-white px-4 py-5 text-center hover:bg-amber-50"
      >
        <span className="text-2xl">🎬</span>
        <span className="mt-1 text-sm font-medium text-amber-900">
          {uploading ? t.ed.uploading : t.ed.videoUploadDevice}
        </span>
        <span className="text-xs text-amber-900/50">{t.ed.videoFormats}</span>
      </div>
      {uploadErr && <p className="text-xs text-red-500">{uploadErr}</p>}

      {v && (
        <>
          <div className="flex gap-3 rounded-lg border border-amber-900/15 bg-white p-2">
            {v.provider === "local" ? (
              <video
                src={v.url}
                preload="metadata"
                muted
                className="h-16 w-28 shrink-0 rounded bg-black object-contain"
              />
            ) : v.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={v.thumbnail}
                alt=""
                className="h-16 w-28 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
                {v.provider}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-gray-800">
                {v.title}
              </div>
              <div className="text-xs text-gray-400">
                {v.provider === "local" ? t.ed.uploadedFromDevice : v.provider}
              </div>
            </div>
            <button
              onClick={() => {
                onChange({ video: null });
                onCommit();
              }}
              className="self-start text-xs text-red-400 hover:text-red-600"
            >
              {t.ed.remove}
            </button>
          </div>

          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-medium text-amber-900/70">
              <span>{t.ed.videoSize}</span>
              <span className="tabular-nums text-amber-900/50">
                %{Math.round((v.scale ?? 0.7) * 100)}
              </span>
            </label>
            <input
              type="range"
              min={20}
              max={100}
              value={Math.round((v.scale ?? 0.7) * 100)}
              onChange={(e) =>
                onChange({ video: { ...v, scale: Number(e.target.value) / 100 } })
              }
              onPointerUp={onCommit}
              className="w-full accent-amber-700"
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Page background editor ----------------------------------- */

function BackgroundEditor({
  page,
  onChange,
  onCommit,
  onImportPdf,
}: {
  page: BookPage;
  onChange: (patch: Partial<BookPage>) => void;
  onCommit: () => void;
  /** Multi-page import: page 1 → this page's bg, the rest → new pages. */
  onImportPdf?: (urls: string[]) => void;
}) {
  const t = useT();
  const [uploading, setUploading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<{ d: number; t: number } | null>(
    null
  );
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isPdf = (f: File) =>
    f.type === "application/pdf" || /\.pdf$/i.test(f.name);

  async function upload(file?: File | null) {
    if (!file) return;

    // PDF → render each page to an image; page 1 becomes this page's
    // background, extra pages are appended as new pages (if supported).
    if (isPdf(file)) {
      setUploading(true);
      setPdfProgress({ d: 0, t: 0 });
      try {
        const blobs = await pdfToJpegBlobs(file, (d, total) =>
          setPdfProgress({ d, t: total })
        );
        const urls: string[] = [];
        for (let i = 0; i < blobs.length; i++) {
          const f = new File([blobs[i]], `pdf-${i + 1}.jpg`, {
            type: "image/jpeg",
          });
          // eslint-disable-next-line no-await-in-loop
          const { url } = await uploadImage(f);
          urls.push(url);
          setPdfProgress({ d: blobs.length + i + 1, t: blobs.length * 2 });
        }
        if (urls.length === 0) return;
        if (onImportPdf && urls.length > 1) {
          onImportPdf(urls);
        } else {
          onChange({ bgImage: urls[0], bgColor: null });
          onCommit();
        }
      } catch {
        alert(t.ed.pdfBgFailed);
      } finally {
        setUploading(false);
        setPdfProgress(null);
      }
      return;
    }

    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      onChange({ bgImage: url });
      onCommit();
    } catch {
      /* ignore */
    } finally {
      setUploading(false);
    }
  }

  const uploadLabel = pdfProgress
    ? pdfProgress.t
      ? `${t.ed.pdfConverting} ${Math.min(pdfProgress.d, pdfProgress.t)}/${
          pdfProgress.t
        }`
      : t.ed.pdfConverting
    : t.ed.uploading;

  return (
    <div className="mt-2 border-t border-amber-900/10 pt-4">
      <h3 className="mb-2 text-sm font-semibold text-amber-950">
        {t.ed.pageBg}
      </h3>

      {/* double-page spread toggle */}
      <label className="mb-3 flex cursor-pointer items-start gap-2 rounded-lg border border-amber-900/15 bg-amber-50/50 p-2.5">
        <input
          type="checkbox"
          checked={!!page.bgSpread}
          onChange={(e) => {
            onChange({ bgSpread: e.target.checked });
            onCommit();
          }}
          className="mt-0.5 h-4 w-4 accent-amber-700"
        />
        <span className="text-xs text-amber-900/80">
          <strong>{t.ed.spread}</strong>
          <br />
          {t.ed.spreadHint}
        </span>
      </label>

      {/* ready-made glossy 3D backgrounds */}
      <div className="mb-1 text-xs font-medium text-amber-900/70">
        {t.ed.bg3d}
      </div>
      <div className="mb-3 grid grid-cols-5 gap-2">
        {BG_LIBRARY.map((bg) => {
          const active = page.bgColor === bg.css;
          return (
            <button
              key={bg.id}
              title={bg.label}
              onClick={() => {
                onChange({ bgColor: bg.css, bgImage: null });
                onCommit();
              }}
              className={`h-10 rounded-md border-2 shadow-sm transition ${
                active
                  ? "border-amber-600 ring-2 ring-amber-400"
                  : "border-white/40 hover:scale-105"
              }`}
              style={{ background: bg.css, backgroundSize: "cover" }}
            />
          );
        })}
      </div>

      <div className="mb-3 flex items-center gap-3">
        <label className="text-xs font-medium text-amber-900/70">
          {t.ed.color}
        </label>
        <input
          type="color"
          value={page.bgColor || "#f3e9d2"}
          onChange={(e) => onChange({ bgColor: e.target.value })}
          onBlur={onCommit}
          className="h-8 w-12 cursor-pointer rounded border border-amber-900/20 bg-white"
        />
        {page.bgColor && (
          <button
            onClick={() => {
              onChange({ bgColor: null });
              onCommit();
            }}
            className="text-xs text-red-400 hover:text-red-600"
          >
            {t.ed.removeColor}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0])}
      />
      {page.bgImage ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.bgImage}
            alt=""
            className="h-14 w-20 rounded border border-amber-900/15 object-cover"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-md border border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-60"
          >
            {uploading ? uploadLabel : t.ed.change}
          </button>
          <button
            onClick={() => {
              onChange({ bgImage: null });
              onCommit();
            }}
            className="text-xs text-red-400 hover:text-red-600"
          >
            {t.ed.remove}
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-lg border border-dashed border-amber-700/50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-60"
        >
          {uploading ? uploadLabel : t.ed.bgUpload}
        </button>
      )}
      <p className="mt-1 text-[11px] text-amber-900/50">{t.ed.pdfBgHint}</p>
    </div>
  );
}

/* ---------------- Links / social badges editor ----------------------------- */

function LinksEditor({
  page,
  onChange,
  onCommit,
}: {
  page: BookPage;
  onChange: (patch: Partial<BookPage>) => void;
  onCommit: () => void;
}) {
  const t = useT();
  const links = page.links ?? [];
  const [platform, setPlatform] = useState<LinkPlatform>("instagram");
  const [url, setUrl] = useState("");
  const [customIcon, setCustomIcon] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const iconRef = useRef<HTMLInputElement | null>(null);

  async function uploadCustom(file?: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const { url: u } = await uploadImage(file);
      setCustomIcon(u);
    } catch {
      /* ignore */
    } finally {
      setUploading(false);
    }
  }

  function add() {
    const u = normalizeUrl(url);
    if (!u) return;
    if (platform === "custom" && !customIcon) return;
    const link: LinkItem = {
      id: genId("l_"),
      platform,
      url: u,
      iconSrc: platform === "custom" ? customIcon : null,
      x: 42,
      y: 8,
      size: 12,
    };
    onChange({ links: [...links, link] });
    onCommit();
    setUrl("");
    setCustomIcon(null);
  }

  function remove(id: string) {
    onChange({ links: links.filter((l) => l.id !== id) });
    onCommit();
  }

  const options: { key: LinkPlatform; label: string }[] = [
    ...SOCIAL_LIST.map((s) => ({ key: s.platform as LinkPlatform, label: s.label })),
    { key: "custom", label: t.ed.custom },
  ];

  return (
    <div className="mt-2 border-t border-amber-900/10 pt-4">
      <h3 className="mb-1 text-sm font-semibold text-amber-950">
        {t.ed.linksTitle}
      </h3>
      <p className="mb-3 text-xs text-amber-900/55">{t.ed.linksHint}</p>

      {/* platform picker */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={() => setPlatform(o.key)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
              platform === o.key
                ? "border-amber-600 bg-amber-50 text-amber-900"
                : "border-amber-900/15 bg-white text-gray-600 hover:bg-amber-50"
            }`}
          >
            {o.key !== "custom" ? (
              <span className="h-4 w-4">
                <SocialIcon platform={o.key as Exclude<LinkPlatform, "custom">} />
              </span>
            ) : (
              <span>➕</span>
            )}
            {o.label}
          </button>
        ))}
      </div>

      {platform === "custom" && (
        <div className="mb-2 flex items-center gap-2">
          <input
            ref={iconRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => uploadCustom(e.target.files?.[0])}
          />
          <button
            onClick={() => iconRef.current?.click()}
            className="rounded-lg border border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
          >
            {uploading
              ? t.ed.uploading
              : customIcon
              ? t.ed.changeLogo
              : t.ed.uploadLogo}
          </button>
          {customIcon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={customIcon}
              alt=""
              className="h-8 w-8 rounded object-contain"
            />
          )}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="https://…"
          className="min-w-0 flex-1 rounded-lg border border-amber-900/20 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600"
        />
        <button
          onClick={add}
          disabled={!url.trim() || (platform === "custom" && !customIcon)}
          className="shrink-0 rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {t.ed.add}
        </button>
      </div>

      {links.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {links.map((l) => (
            <li
              key={l.id}
              className="flex items-center gap-2 rounded-lg border border-amber-900/10 bg-white px-2 py-1.5"
            >
              <span className="h-6 w-6 shrink-0">
                {l.platform === "custom" ? (
                  l.iconSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.iconSrc}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span>↗</span>
                  )
                ) : (
                  <SocialIcon
                    platform={l.platform as Exclude<LinkPlatform, "custom">}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-gray-600">
                {l.url}
              </span>
              <button
                onClick={() => remove(l.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                {t.ed.delete}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- Page editor (text / video / image tabs) ------------------ */

export default function PageEditor({
  page,
  onChange,
  onCommit,
  onImportPdf,
}: {
  page: BookPage;
  /** fires on every keystroke — drives the live preview */
  onChange: (patch: Partial<BookPage>) => void;
  /** fires on blur — drives the debounced DB save */
  onCommit: () => void;
  /** multi-page PDF background import (only for real pages, not the end page) */
  onImportPdf?: (urls: string[]) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-5">
      <TextBlocksEditor page={page} onChange={onChange} onCommit={onCommit} />

      <div className="border-t border-amber-900/10 pt-4">
        <h3 className="mb-2 text-sm font-semibold text-amber-950">
          {t.ed.imageSection}
        </h3>
        <ImageEditor page={page} onChange={onChange} onCommit={onCommit} />
      </div>

      <div className="border-t border-amber-900/10 pt-4">
        <h3 className="mb-2 text-sm font-semibold text-amber-950">
          {t.ed.videoSection}
        </h3>
        <VideoEditor page={page} onChange={onChange} onCommit={onCommit} />
      </div>

      <BackgroundEditor
        page={page}
        onChange={onChange}
        onCommit={onCommit}
        onImportPdf={onImportPdf}
      />
      <LinksEditor page={page} onChange={onChange} onCommit={onCommit} />
    </div>
  );
}

