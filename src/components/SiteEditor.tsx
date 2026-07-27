"use client";

import { useEffect, useRef, useState } from "react";
import type { MusicTrack, SiteAsset, SiteDoc } from "@/lib/types";
import { useT } from "@/lib/LangProvider";
import { uploadHtml, uploadVideo } from "@/lib/api";
import MusicEditor from "./MusicEditor";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB (uploaded straight to storage)

export default function SiteEditor({
  site,
  onChange,
  onCommit,
  viewPassword,
  onSetPassword,
  genPassword,
  music,
  onMusicChange,
}: {
  site: SiteDoc;
  onChange: (next: SiteDoc) => void;
  onCommit: () => void;
  viewPassword: string | null;
  onSetPassword: (value: string | null, commit?: boolean) => void;
  genPassword: () => string;
  music: MusicTrack[];
  onMusicChange: (music: MusicTrack[]) => void;
}) {
  const t = useT();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [uploading, setUploading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const mediaRef = useRef<HTMLInputElement | null>(null);
  const assets = site.assets ?? [];

  async function addMedia(file?: File | null) {
    if (!file) return;
    setMediaUploading(true);
    try {
      const { url } = await uploadVideo(file);
      const kind: SiteAsset["kind"] = file.type.startsWith("image/")
        ? "image"
        : "video";
      onChange({ ...site, assets: [...assets, { url, name: file.name, kind }] });
      onCommit();
    } catch {
      alert(t.site.readFailed);
    } finally {
      setMediaUploading(false);
    }
  }

  function snippetFor(a: SiteAsset): string {
    return a.kind === "image"
      ? `<img src="${a.url}" alt="" style="width:100%;max-width:720px;border-radius:12px" />`
      : `<video controls playsinline src="${a.url}" style="width:100%;max-width:720px;border-radius:12px"></video>`;
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  }
  // Content shown in the live preview (from the current file, inline html, or
  // fetched from the uploaded URL when the editor is reopened).
  const [previewHtml, setPreviewHtml] = useState<string>(site.html || "");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (site.html) {
      setPreviewHtml(site.html);
      return;
    }
    if (site.htmlUrl) {
      let alive = true;
      fetch(site.htmlUrl)
        .then((r) => r.text())
        .then((txt) => alive && setPreviewHtml(txt))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }
    setPreviewHtml("");
  }, [site.html, site.htmlUrl]);

  async function downloadHtml() {
    let html = previewHtml;
    if (!html && site.htmlUrl) {
      try {
        html = await (await fetch(site.htmlUrl)).text();
      } catch {
        /* ignore */
      }
    }
    if (!html) return;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = site.fileName || "page.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function pick(file?: File | null) {
    if (!file) return;
    const isHtml = file.type === "text/html" || /\.html?$/i.test(file.name);
    if (!isHtml) {
      alert(t.site.notHtml);
      return;
    }
    if (file.size > MAX_BYTES) {
      alert(t.site.tooLarge);
      return;
    }
    // Show the preview immediately from the local file…
    const reader = new FileReader();
    reader.onload = () => setPreviewHtml(String(reader.result ?? ""));
    reader.onerror = () => alert(t.site.readFailed);
    reader.readAsText(file);
    // …and upload the file straight to storage (no serverless body limit),
    // saving only its URL in the document.
    setUploading(true);
    try {
      const { url } = await uploadHtml(file);
      onChange({ html: "", htmlUrl: url, fileName: file.name });
      onCommit();
    } catch {
      alert(t.site.readFailed);
    } finally {
      setUploading(false);
    }
  }

  const hasHtml = !!(site.htmlUrl || site.html.trim());

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* ---- left: upload + settings ---- */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-amber-900/15 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold text-amber-950">
              {t.site.htmlFile}
            </h2>

            <input
              ref={fileRef}
              type="file"
              accept=".html,.htm,text/html"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />

            {hasHtml ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 rounded-lg border border-amber-900/10 bg-amber-50/60 px-3 py-2">
                  <span>📄</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-amber-950">
                    {site.fileName || "page.html"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex-1 rounded-lg border border-amber-700 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-60"
                  >
                    {uploading ? t.ed.uploading : t.site.replace}
                  </button>
                  <button
                    onClick={downloadHtml}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    ⬇ {t.site.download}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  pick(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-900/25 bg-white px-4 py-8 text-center hover:bg-amber-50"
              >
                <span className="text-3xl">🌐</span>
                <span className="mt-2 text-sm font-medium text-amber-900">
                  {uploading ? t.ed.uploading : t.site.drop}
                </span>
                <span className="mt-1 text-xs text-amber-900/50">
                  {t.site.dropHint}
                </span>
              </div>
            )}

            <p className="mt-3 text-[11px] leading-relaxed text-amber-900/55">
              {t.site.hint}
            </p>
          </div>

          {/* media (video/image) → get a link to paste into the HTML */}
          <div className="rounded-2xl border border-amber-900/15 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-amber-950">
              {t.site.mediaTitle}
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-900/55">
              {t.site.mediaHint}
            </p>
            <input
              ref={mediaRef}
              type="file"
              accept="video/*,image/*"
              className="hidden"
              onChange={(e) => addMedia(e.target.files?.[0])}
            />
            <button
              onClick={() => mediaRef.current?.click()}
              disabled={mediaUploading}
              className="mt-3 w-full rounded-lg border border-dashed border-amber-700/50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-60"
            >
              {mediaUploading ? t.ed.uploading : `🎬 ${t.site.mediaUpload}`}
            </button>

            {assets.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2">
                {assets.map((a, i) => (
                  <li
                    key={a.url}
                    className="rounded-lg border border-amber-900/10 bg-amber-50/50 p-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">
                        {a.kind === "image" ? "🖼️" : "🎬"}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-amber-950">
                        {a.name}
                      </span>
                      <button
                        onClick={() => {
                          onChange({
                            ...site,
                            assets: assets.filter((_, j) => j !== i),
                          });
                          onCommit();
                        }}
                        className="text-xs text-red-400 hover:text-red-600"
                        title={t.ed.delete}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <button
                        onClick={() => copy(a.url, `url-${i}`)}
                        className="flex-1 rounded-md border border-amber-700 px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-50"
                      >
                        {copied === `url-${i}` ? t.site.copied : t.site.copyLink}
                      </button>
                      <button
                        onClick={() => copy(snippetFor(a), `snip-${i}`)}
                        className="flex-1 rounded-md bg-amber-700 px-2 py-1 text-[11px] font-medium text-white hover:bg-amber-800"
                      >
                        {copied === `snip-${i}`
                          ? t.site.copied
                          : t.site.copySnippet}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[11px] text-amber-900/40">
                {t.site.mediaEmpty}
              </p>
            )}
          </div>

          {/* password */}
          <div className="rounded-2xl border border-amber-900/15 bg-white p-4 shadow-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={viewPassword != null}
                onChange={(e) =>
                  onSetPassword(e.target.checked ? genPassword() : null, true)
                }
                className="h-4 w-4 accent-amber-700"
              />
              <span className="text-sm font-semibold text-amber-950">
                {t.ed.protect}
              </span>
            </label>
            {viewPassword != null && (
              <div className="mt-3">
                <div className="flex gap-2">
                  <input
                    value={viewPassword}
                    onChange={(e) => onSetPassword(e.target.value)}
                    onBlur={onCommit}
                    placeholder={t.ed.passwordPh}
                    className="min-w-0 flex-1 rounded-lg border border-amber-900/20 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-amber-600"
                  />
                  <button
                    onClick={() => onSetPassword(genPassword(), true)}
                    className="shrink-0 rounded-lg border border-amber-700 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-50"
                  >
                    {t.ed.random}
                  </button>
                </div>
                <p className="mt-2 text-xs text-amber-900/55">
                  {t.ed.protectHint}
                </p>
              </div>
            )}
          </div>

          {/* background music */}
          <div className="rounded-2xl border border-amber-900/15 bg-white p-4 shadow-sm">
            <MusicEditor
              music={music}
              onChange={onMusicChange}
              onCommit={onCommit}
            />
          </div>
        </aside>

        {/* ---- right: live preview ---- */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-amber-950">
              {t.site.preview}
            </h2>
            <div className="flex gap-1 rounded-lg bg-amber-100/60 p-1">
              {(["desktop", "mobile"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    device === d
                      ? "bg-amber-700 text-white"
                      : "text-amber-900/70 hover:bg-amber-100"
                  }`}
                >
                  {d === "desktop" ? t.site.desktop : t.site.mobile}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center overflow-hidden rounded-2xl border border-amber-900/15 bg-gray-100 p-3 shadow-inner">
            {previewHtml ? (
              <iframe
                title="preview"
                srcDoc={previewHtml}
                sandbox="allow-scripts allow-popups allow-forms allow-modals allow-presentation"
                style={{
                  width: device === "mobile" ? 390 : "100%",
                  maxWidth: "100%",
                  height: 620,
                  border: "none",
                  borderRadius: 12,
                  background: "#fff",
                  boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
                }}
              />
            ) : (
              <div className="flex h-[620px] w-full items-center justify-center text-sm text-amber-900/40">
                {t.site.noFile}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
