"use client";

import { useRef, useState } from "react";
import type { BookCover, HelperFile } from "@/lib/types";
import { useT } from "@/lib/LangProvider";
import { uploadHtml } from "@/lib/api";
import { genId, genPassword } from "@/lib/ids";

/**
 * Cross-editor project extras shown below the toolbar for every doc type:
 *  - a collaboration note that blinks in a "cloud" so anyone editing sees it,
 *  - auxiliary HTML files kept as backups, each with its own preview link
 *    (optionally password-protected) — these never affect the main project.
 */
export default function ProjectExtras({
  bookId,
  notes,
  helperFiles,
  onPatch,
  onCommit,
}: {
  bookId: string;
  notes: string;
  helperFiles: HelperFile[];
  onPatch: (patch: Partial<BookCover>) => void;
  onCommit: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(notes);
  const [noteFlash, setNoteFlash] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function saveNote() {
    onPatch({ notes: noteDraft });
    onCommit();
    setNoteFlash(true);
    setTimeout(() => setNoteFlash(false), 1800);
  }

  function updateHelper(id: string, patch: Partial<HelperFile>) {
    onPatch({
      helperFiles: helperFiles.map((h) =>
        h.id === id ? { ...h, ...patch } : h
      ),
    });
  }
  function removeHelper(id: string) {
    onPatch({ helperFiles: helperFiles.filter((h) => h.id !== id) });
    onCommit();
  }

  async function addHelper(file?: File | null) {
    if (!file) return;
    if (!(file.type === "text/html" || /\.html?$/i.test(file.name))) {
      alert(t.proj.notHtml);
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadHtml(file);
      onPatch({
        helperFiles: [
          ...helperFiles,
          {
            id: genId("h_"),
            name: file.name,
            note: "",
            htmlUrl: url,
            password: null,
          },
        ],
      });
      onCommit();
    } catch {
      alert(t.proj.notHtml);
    } finally {
      setUploading(false);
    }
  }

  const helperUrl = (h: HelperFile) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/h/${bookId}/${h.id}`
      : `/h/${bookId}/${h.id}`;

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  }

  const hasNote = notes.trim().length > 0;

  return (
    <div className="border-b border-amber-900/10 bg-[#f7f1e6]">
      <div className="mx-auto max-w-6xl px-4 py-2">
        <div className="flex flex-wrap items-center gap-3">
          {/* blinking note cloud */}
          {hasNote && (
            <div
              className={`note-glow relative flex max-w-2xl items-start gap-2 rounded-2xl border border-amber-300 bg-white px-4 py-2 ${
                noteFlash ? "ring-2 ring-amber-400" : ""
              }`}
            >
              <span className="note-dot mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              <span className="text-sm text-amber-950 whitespace-pre-wrap">
                {notes}
              </span>
              {/* little speech-bubble tail */}
              <span className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 border-b border-r border-amber-300 bg-white" />
            </div>
          )}

          <button
            onClick={() => setOpen((o) => !o)}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-amber-900/20 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-50"
          >
            🗂️ {t.proj.tools}
            {helperFiles.length > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-800">
                {helperFiles.length}
              </span>
            )}
            <span className="text-amber-900/50">{open ? "▲" : "▼"}</span>
          </button>
        </div>

        {open && (
          <div className="mt-3 grid gap-4 rounded-xl border border-amber-900/10 bg-white p-4 shadow-sm lg:grid-cols-2">
            {/* ---- notes ---- */}
            <div>
              <h3 className="text-sm font-semibold text-amber-950">
                {t.proj.notesTitle}
              </h3>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder={t.proj.notesPlaceholder}
                rows={4}
                className="mt-2 w-full resize-y rounded-lg border border-amber-900/20 bg-white px-3 py-2 text-sm text-amber-950 outline-none focus:border-amber-600"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={saveNote}
                  className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800"
                >
                  {noteFlash ? t.proj.noteSaved : t.proj.saveNote}
                </button>
                {hasNote && (
                  <button
                    onClick={() => {
                      setNoteDraft("");
                      onPatch({ notes: "" });
                      onCommit();
                    }}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    {t.proj.clearNote}
                  </button>
                )}
              </div>
            </div>

            {/* ---- helper files ---- */}
            <div>
              <h3 className="text-sm font-semibold text-amber-950">
                {t.proj.helpersTitle}
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-900/55">
                {t.proj.helpersHint}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".html,.htm,text/html"
                className="hidden"
                onChange={(e) => addHelper(e.target.files?.[0])}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-2 w-full rounded-lg border border-dashed border-amber-700/50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-60"
              >
                {uploading ? t.proj.uploading : `⬆ ${t.proj.uploadHelper}`}
              </button>

              {helperFiles.length === 0 ? (
                <p className="mt-2 text-[11px] text-amber-900/40">
                  {t.proj.noHelpers}
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {helperFiles.map((h) => (
                    <li
                      key={h.id}
                      className="rounded-lg border border-amber-900/10 bg-amber-50/50 p-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span>📄</span>
                        <input
                          value={h.name}
                          onChange={(e) =>
                            updateHelper(h.id, { name: e.target.value })
                          }
                          onBlur={onCommit}
                          placeholder={t.proj.helperNamePh}
                          className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-amber-950 outline-none hover:border-amber-900/15 focus:border-amber-600"
                        />
                        <button
                          onClick={() => removeHelper(h.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                          title={t.proj.copyLink}
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        value={h.note ?? ""}
                        onChange={(e) =>
                          updateHelper(h.id, { note: e.target.value })
                        }
                        onBlur={onCommit}
                        placeholder={t.proj.helperNotePh}
                        className="mt-1.5 w-full rounded-md border border-amber-900/15 bg-white px-2 py-1 text-xs text-amber-900 outline-none focus:border-amber-600"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <a
                          href={helperUrl(h)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-white"
                        >
                          {t.proj.preview} ↗
                        </a>
                        <button
                          onClick={() => copy(helperUrl(h), h.id)}
                          className="rounded-md border border-amber-700 px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-50"
                        >
                          {copied === h.id ? t.proj.copied : t.proj.copyLink}
                        </button>
                        <label className="ml-auto flex cursor-pointer items-center gap-1 text-[11px] text-amber-900/80">
                          <input
                            type="checkbox"
                            checked={h.password != null}
                            onChange={(e) => {
                              updateHelper(h.id, {
                                password: e.target.checked
                                  ? genPassword()
                                  : null,
                              });
                              onCommit();
                            }}
                            className="h-3.5 w-3.5 accent-amber-700"
                          />
                          🔒
                        </label>
                      </div>
                      {h.password != null && (
                        <div className="mt-1.5 flex gap-1.5">
                          <input
                            value={h.password}
                            onChange={(e) =>
                              updateHelper(h.id, { password: e.target.value })
                            }
                            onBlur={onCommit}
                            className="min-w-0 flex-1 rounded-md border border-amber-900/20 bg-white px-2 py-1 font-mono text-xs text-amber-950 outline-none focus:border-amber-600"
                          />
                          <button
                            onClick={() => {
                              updateHelper(h.id, { password: genPassword() });
                              onCommit();
                            }}
                            className="shrink-0 rounded-md border border-amber-700 px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-50"
                          >
                            {t.ed.random}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
