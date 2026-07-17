"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "./TopBar";
import PageEditor from "./PageEditor";
import LivePreview from "./LivePreview";
import type { FaceContent } from "./BookFace";
import {
  getBook,
  updateBook,
  publishBook,
  uploadImage,
  uploadVideo,
  fetchVideoMeta,
} from "@/lib/api";
import { genId, genPassword } from "@/lib/ids";
import { useAuth } from "@/lib/owner";
import { getTheme } from "@/lib/themes";
import { getTextBlocks } from "@/lib/textBlocks";
import MusicEditor from "./MusicEditor";
import PdfExportButton from "./PdfExportButton";
import CertificateEditor from "./CertificateEditor";
import { useT } from "@/lib/LangProvider";
import type { Certificate } from "@/lib/types";
import type { Book, BookPage, MusicTrack, TextBlock } from "@/lib/types";

type Selected = "cover" | "end" | number;
type PageRef = number | "end";
type SaveState = "idle" | "saving" | "saved" | "error";

const EMPTY_END_PAGE: BookPage = { id: "endpage", kind: "text", texts: [] };

export default function Editor({ id }: { id: string }) {
  const router = useRouter();
  useAuth(true);
  const t = useT();
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selected>("cover");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverVideoUploading, setCoverVideoUploading] = useState(false);
  const [coverVideoUrl, setCoverVideoUrl] = useState("");

  const bookRef = useRef<Book | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const coverVideoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    bookRef.current = book;
  }, [book]);

  useEffect(() => {
    getBook(id)
      .then((b) => setBook(b))
      .catch((e) => setError(e.message || t.ed.loadFailed));
  }, [id]);

  const doSave = useCallback(async () => {
    const b = bookRef.current;
    if (!b) return;
    setSaveState("saving");
    try {
      const saved = await updateBook(b.id, {
        cover: b.cover,
        pages: b.pages,
        themeKey: b.themeKey,
        music: b.music ?? [],
        viewPassword: b.viewPassword ?? null,
      });
      // keep slug/status fresh without clobbering local edits
      setBook((prev) =>
        prev
          ? { ...prev, slug: saved.slug, status: saved.status, updatedAt: saved.updatedAt }
          : prev
      );
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, []);

  const scheduleSave = useCallback(() => {
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 900);
  }, [doSave]);

  const commitSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    return doSave();
  }, [doSave]);

  // Open the live page, but flush pending edits first and bust the browser
  // cache so the freshly-saved version is what actually loads.
  async function viewLive() {
    if (!book?.slug) return;
    const w = window.open("about:blank", "_blank"); // opened on the user gesture
    await commitSave();
    const url = `/b/${book.slug}?v=${Date.now()}`;
    if (w) w.location.href = url;
    else window.open(url, "_blank", "noopener");
  }

  // Flush pending save when leaving the page.
  useEffect(() => {
    return () => {
      // Flush a pending debounced save on the way out so an edit made right
      // before leaving (e.g. removing the password) isn't silently dropped.
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
        void doSave();
      }
    };
  }, [doSave]);

  // ---- mutations (immediate local state → instant live preview) ----
  function patchCover(patch: Partial<Book["cover"]>) {
    setBook((b) => (b ? { ...b, cover: { ...b.cover, ...patch } } : b));
    scheduleSave();
  }

  function patchCert(next: Certificate) {
    const cur = bookRef.current;
    if (!cur) return;
    const nb = { ...cur, cover: { ...cur.cover, certificate: next } };
    bookRef.current = nb; // keep ref fresh so an immediate save isn't stale
    setBook(nb);
    scheduleSave();
  }

  function patchMusic(music: MusicTrack[]) {
    setBook((b) => (b ? { ...b, music } : b));
    scheduleSave();
  }

  function setViewPassword(pw: string | null, immediate = false) {
    const cur = bookRef.current;
    if (!cur) return;
    const next = { ...cur, viewPassword: pw };
    bookRef.current = next; // keep ref fresh so the save isn't stale
    setBook(next);
    // Toggling protection on/off should take effect right away, not after a
    // debounce the user might interrupt by leaving the editor.
    if (immediate) commitSave();
    else scheduleSave();
  }

  async function handleCoverFile(file?: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    setCoverUploading(true);
    try {
      const { url } = await uploadImage(file);
      patchCover({ image: url });
      commitSave();
    } catch {
      alert(t.ed.coverImageFailed);
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleCoverVideoFile(file?: File | null) {
    if (!file) return;
    const looksVideo =
      file.type.startsWith("video/") ||
      /\.(mp4|webm|mov|m4v|mkv|3gp|ogv|mpe?g)$/i.test(file.name);
    if (!looksVideo) {
      alert(t.ed.pickVideo);
      return;
    }
    setCoverVideoUploading(true);
    try {
      const { url } = await uploadVideo(file);
      patchCover({
        video: {
          provider: "local",
          url,
          title: file.name.replace(/\.[^.]+$/, ""),
          thumbnail: "",
        },
      });
      commitSave();
    } catch (e) {
      alert(e instanceof Error ? e.message : t.ed.coverVideoFailed);
    } finally {
      setCoverVideoUploading(false);
    }
  }

  async function loadCoverVideoLink() {
    const url = coverVideoUrl.trim();
    if (!url) return;
    const meta = await fetchVideoMeta(url);
    if (!meta) {
      alert(t.ed.linkFailed);
      return;
    }
    patchCover({ video: meta });
    commitSave();
    setCoverVideoUrl("");
  }

  /** Writes text blocks, clearing any legacy single-text fields. */
  function setTextBlocks(index: PageRef, blocks: TextBlock[]) {
    setBook((b) => {
      if (!b) return b;
      const apply = (p: BookPage): BookPage => ({
        ...p,
        texts: blocks,
        heading: undefined,
        body: undefined,
        textX: undefined,
        textY: undefined,
      });
      if (index === "end") {
        return {
          ...b,
          cover: { ...b.cover, endPage: apply(b.cover.endPage ?? EMPTY_END_PAGE) },
        };
      }
      const pages = b.pages.slice();
      pages[index] = apply(pages[index]);
      return { ...b, pages };
    });
    scheduleSave();
  }

  function updateTextBlock(index: PageRef, id: string, patch: Partial<TextBlock>) {
    const page =
      index === "end" ? book?.cover.endPage ?? EMPTY_END_PAGE : book?.pages[index];
    if (!page) return;
    const blocks = getTextBlocks(page).map((t) =>
      t.id === id ? { ...t, ...patch } : t
    );
    setTextBlocks(index, blocks);
  }

  function patchPage(index: PageRef, patch: Partial<BookPage>) {
    setBook((b) => {
      if (!b) return b;
      if (index === "end") {
        return {
          ...b,
          cover: {
            ...b.cover,
            endPage: { ...(b.cover.endPage ?? EMPTY_END_PAGE), ...patch },
          },
        };
      }
      const pages = b.pages.slice();
      pages[index] = { ...pages[index], ...patch };

      // Keep a spread background in sync with the neighbouring page.
      const touchesBg =
        "bgColor" in patch || "bgImage" in patch || "bgSpread" in patch;
      const cur = pages[index];
      if (touchesBg && cur.bgSpread) {
        // spread pairs are (0,1),(2,3),… → even index is the left page
        const partner = index % 2 === 0 ? index + 1 : index - 1;
        if (partner >= 0 && partner < pages.length) {
          pages[partner] = {
            ...pages[partner],
            bgColor: cur.bgColor ?? null,
            bgImage: cur.bgImage ?? null,
            bgSpread: true,
          };
        }
      }
      return { ...b, pages };
    });
    scheduleSave();
  }

  function addPage(kind: "text" | "video" | "image") {
    const cur = bookRef.current;
    if (!cur) return;
    const newPage: BookPage =
      kind === "text"
        ? { id: genId("p_"), kind: "text", heading: "", body: "" }
        : kind === "image"
        ? { id: genId("p_"), kind: "image", image: null, caption: "" }
        : { id: genId("p_"), kind: "video", video: null, caption: "" };
    const next = { ...cur, pages: [...cur.pages, newPage] };
    bookRef.current = next; // keep ref in lockstep so the save below isn't stale
    setBook(next);
    setSelected(next.pages.length - 1);
    commitSave();
  }

  /**
   * Import a multi-page PDF as page backgrounds: page 1 becomes `index`'s
   * background, the remaining pages are inserted right after it.
   */
  function importPdf(index: number, urls: string[]) {
    const cur = bookRef.current;
    if (!cur || urls.length === 0) return;
    const pages = cur.pages.slice();
    // Multi-page PDF import → make the current page a clean full-page PDF
    // background too (drop any template placeholder text/media), so every
    // imported page looks the same.
    pages[index] = {
      ...pages[index],
      bgImage: urls[0],
      bgColor: null,
      texts: [],
      heading: undefined,
      body: undefined,
      image: null,
      video: null,
      caption: undefined,
    };
    const extra: BookPage[] = urls.slice(1).map((u) => ({
      id: genId("p_"),
      kind: "text",
      texts: [],
      bgImage: u,
    }));
    pages.splice(index + 1, 0, ...extra);
    const next = { ...cur, pages };
    bookRef.current = next;
    setBook(next);
    setSelected(index);
    commitSave();
  }

  function deletePage(index: number) {
    const cur = bookRef.current;
    if (!cur) return;
    const next = { ...cur, pages: cur.pages.filter((_, i) => i !== index) };
    bookRef.current = next;
    setBook(next);
    setSelected((s) =>
      typeof s === "number" ? Math.max(0, Math.min(s - 1, 9999)) : s
    );
    commitSave();
  }

  function movePage(index: number, dir: -1 | 1) {
    const cur = bookRef.current;
    if (!cur) return;
    const target = index + dir;
    if (target < 0 || target >= cur.pages.length) return;
    const pages = cur.pages.slice();
    [pages[index], pages[target]] = [pages[target], pages[index]];
    const next = { ...cur, pages };
    bookRef.current = next;
    setBook(next);
    setSelected((s) => (typeof s === "number" ? s + dir : s));
    commitSave();
  }

  async function togglePublish() {
    if (!book) return;
    setPublishing(true);
    // make sure latest edits are stored first
    await doSave();
    try {
      const updated = await publishBook(book.id, book.status !== "published");
      setBook((b) =>
        b ? { ...b, status: updated.status, slug: updated.slug } : b
      );
    } catch {
      alert(t.ed.actionFailed);
    } finally {
      setPublishing(false);
    }
  }

  function shareUrl(): string {
    if (!book?.slug) return "";
    if (typeof window === "undefined") return `/b/${book.slug}`;
    return `${window.location.origin}/b/${book.slug}`;
  }

  async function copyLink() {
    const url = shareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be blocked */
    }
  }

  // ---- render ----
  if (error) {
    return (
      <div className="min-h-screen bg-[#efe6d2]">
        <TopBar />
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <p className="text-amber-900">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 rounded-lg bg-amber-700 px-4 py-2 text-sm text-white"
          >
            Panele dön
          </button>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[#efe6d2]">
        <TopBar />
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="skeleton mb-4 h-10 w-1/3 rounded-lg" />
          <div className="grid gap-4 lg:grid-cols-[14rem_1fr_22rem]">
            <div className="skeleton h-96 rounded-xl" />
            <div className="skeleton h-96 rounded-xl" />
            <div className="skeleton h-96 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const theme = getTheme(book.themeKey);
  const published = book.status === "published";

  const previewContent: FaceContent =
    selected === "cover"
      ? { type: "cover", cover: book.cover }
      : selected === "end"
      ? {
          type: "page",
          page: book.cover.endPage ?? EMPTY_END_PAGE,
          pageNumber: book.pages.length + 1,
          isEnd: true,
        }
      : {
          type: "page",
          page: book.pages[selected as number],
          pageNumber: (selected as number) + 1,
        };

  // The page object the preview is currently editing (numbered page or end page).
  const selRef: PageRef | null = selected === "cover" ? null : selected;
  const selPageObj: BookPage | undefined =
    selected === "cover"
      ? undefined
      : selected === "end"
      ? book.cover.endPage ?? EMPTY_END_PAGE
      : book.pages[selected];

  const saveLabel =
    saveState === "saving"
      ? t.editor.saving
      : saveState === "saved"
      ? t.editor.saved
      : saveState === "error"
      ? t.editor.saveFailed
      : "";

  // ---- Certificate document → dedicated editor ----
  if (book.cover.docType === "certificate") {
    const cert: Certificate = book.cover.certificate ?? {
      title: t.cert.defTitle,
      subtitle: t.cert.defSubtitle,
      body: "",
      template: "classic",
      accent: "#b8923f",
      personnel: [],
    };
    return (
      <div className="min-h-screen bg-[#efe6d2]">
        <TopBar activeBookId={book.id} />
        <div className="border-b border-amber-900/10 bg-[#f7f1e6]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎓</span>
              <input
                value={book.cover.name ?? ""}
                onChange={(e) => patchCover({ name: e.target.value })}
                onBlur={commitSave}
                placeholder={t.cert.docName}
                className="rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-amber-950 outline-none hover:border-amber-900/15 focus:border-amber-600"
              />
            </div>
            <span className="text-xs text-amber-900/40">{saveLabel}</span>
          </div>
        </div>
        <CertificateEditor
          cert={cert}
          onChange={patchCert}
          onCommit={commitSave}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#efe6d2]">
      <TopBar activeBookId={book.id} />

      {/* toolbar */}
      <div className="border-b border-amber-900/10 bg-[#f7f1e6]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-amber-950">
              {book.cover.name || book.cover.title || t.common.untitledBook}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                published
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {published ? t.common.published : t.common.draft}
            </span>
            <span className="text-xs text-amber-900/40">{saveLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <PdfExportButton book={book} theme={theme} />
            {published && book.slug && (
              <>
                <button
                  onClick={viewLive}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-white"
                >
                  {t.editor.view}
                </button>
                <button
                  onClick={copyLink}
                  className="rounded-lg border border-amber-700 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50"
                >
                  {copied ? t.editor.copied : t.editor.copyLink}
                </button>
              </>
            )}
            <button
              onClick={togglePublish}
              disabled={publishing}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium text-white shadow disabled:opacity-50 ${
                published
                  ? "bg-gray-600 hover:bg-gray-700"
                  : "bg-amber-700 hover:bg-amber-800"
              }`}
            >
              {publishing
                ? t.editor.working
                : published
                ? t.editor.unpublish
                : t.editor.publish}
            </button>
          </div>
        </div>
        {published && book.slug && (
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 pb-3">
            <code className="rounded bg-white px-2 py-1 text-xs text-amber-900/70">
              {shareUrl()}
            </code>
            {book.cover.shareCode && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
                {t.editor.shareCode}
                <code className="tracking-[0.2em] text-amber-950">
                  {book.cover.shareCode}
                </code>
              </span>
            )}
          </div>
        )}
      </div>

      {/* main */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[14rem_1fr_22rem]">
          {/* sidebar */}
          <aside className="flex flex-col gap-2">
            <button
              onClick={() => setSelected("cover")}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                selected === "cover"
                  ? "border-amber-700 bg-amber-50 font-medium text-amber-900"
                  : "border-amber-900/15 bg-white text-gray-700 hover:bg-amber-50"
              }`}
            >
              📕 {t.ed.cover}
            </button>

            <div className="mt-1 text-[11px] uppercase tracking-wider text-amber-900/40">
              {t.ed.pages}
            </div>

            {book.pages.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-sm ${
                  selected === i
                    ? "border-amber-700 bg-amber-50"
                    : "border-amber-900/15 bg-white"
                }`}
              >
                <button
                  onClick={() => setSelected(i)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="text-xs text-amber-900/40">{i + 1}</span>
                  <span className="truncate text-gray-700">
                    {getTextBlocks(p)[0]?.body?.slice(0, 20) ||
                      (p.image?.src
                        ? t.ed.imagePage
                        : p.video
                        ? `🎬 ${p.video.title || t.ed.videoSection}`
                        : "")}
                  </span>
                </button>
                <div className="flex flex-col">
                  <button
                    onClick={() => movePage(i, -1)}
                    disabled={i === 0}
                    className="text-[10px] leading-none text-gray-400 disabled:opacity-30"
                    title={t.ed.up}
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => movePage(i, 1)}
                    disabled={i === book.pages.length - 1}
                    className="text-[10px] leading-none text-gray-400 disabled:opacity-30"
                    title={t.ed.down}
                  >
                    ▼
                  </button>
                </div>
                <button
                  onClick={() => deletePage(i)}
                  className="ml-1 text-xs text-red-400 hover:text-red-600"
                  title={t.ed.delete}
                >
                  ✕
                </button>
              </div>
            ))}

            <div className="mt-2">
              <button
                onClick={() => addPage("text")}
                className="w-full rounded-lg border border-dashed border-amber-700/50 px-2 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-50"
              >
                {t.ed.addPage}
              </button>
            </div>

            <button
              onClick={() => setSelected("end")}
              className={`mt-3 w-full rounded-lg border px-3 py-2 text-left text-sm font-medium ${
                selected === "end"
                  ? "border-amber-700 bg-amber-50 text-amber-950"
                  : "border-amber-900/15 bg-white text-amber-900/80 hover:bg-amber-50"
              }`}
            >
              {t.ed.endPage}
            </button>
          </aside>

          {/* editor form */}
          <section className="rounded-xl border border-amber-900/15 bg-white p-5">
            {selected === "cover" ? (
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-amber-950">
                  {t.ed.cover}
                </h2>
                <div className="rounded-lg border border-amber-900/10 bg-amber-50/50 p-3">
                  <label className="mb-1 block text-xs font-medium text-amber-900/70">
                    {t.ed.bookName}
                  </label>
                  <input
                    value={book.cover.name ?? ""}
                    onChange={(e) => patchCover({ name: e.target.value })}
                    onBlur={commitSave}
                    placeholder={t.ed.bookNamePh}
                    className="w-full rounded-lg border border-amber-900/20 bg-white px-3 py-2 outline-none focus:border-amber-600"
                  />
                  <p className="mt-1 text-[11px] text-amber-900/50">
                    {t.ed.bookNameHint}
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-amber-900/70">
                    {t.ed.titleLabel}
                  </label>
                  <input
                    value={book.cover.title}
                    onChange={(e) => patchCover({ title: e.target.value })}
                    onBlur={commitSave}
                    placeholder={t.ed.titlePh}
                    className="w-full rounded-lg border border-amber-900/20 bg-white px-3 py-2 text-lg outline-none focus:border-amber-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-amber-900/70">
                    {t.ed.subtitleLabel}
                  </label>
                  <input
                    value={book.cover.subtitle}
                    onChange={(e) => patchCover({ subtitle: e.target.value })}
                    onBlur={commitSave}
                    placeholder={t.ed.subtitlePh}
                    className="w-full rounded-lg border border-amber-900/20 bg-white px-3 py-2 outline-none focus:border-amber-600"
                  />
                </div>

                {/* cover image */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-amber-900/70">
                    {t.ed.coverImage}
                  </label>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleCoverFile(e.target.files?.[0])}
                  />
                  {book.cover.image ? (
                    <div className="flex items-center gap-3">
                      <div
                        className="h-20 w-16 shrink-0 overflow-hidden rounded-md border border-amber-900/15"
                        style={{ background: theme.colors.cover }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={book.cover.image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => coverInputRef.current?.click()}
                          className="rounded-md border border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
                        >
                          {coverUploading ? t.ed.uploading : t.ed.change}
                        </button>
                        <button
                          onClick={() => {
                            patchCover({ image: null });
                            commitSave();
                          }}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                        >
                          {t.ed.remove}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleCoverFile(e.dataTransfer.files?.[0]);
                      }}
                      onClick={() => coverInputRef.current?.click()}
                      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-900/25 bg-white px-4 py-5 text-center hover:bg-amber-50"
                    >
                      <span className="text-xl">🖼️</span>
                      <span className="mt-1 text-sm font-medium text-amber-900">
                        {coverUploading ? t.ed.uploading : t.ed.coverImageAdd}
                      </span>
                      <span className="text-xs text-amber-900/50">
                        {t.ed.coverImageHint}
                      </span>
                    </div>
                  )}
                </div>

                {/* cover video (autoplay, silent, loop) */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-amber-900/70">
                    {t.ed.coverVideo}
                  </label>
                  <input
                    ref={coverVideoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) =>
                      handleCoverVideoFile(e.target.files?.[0])
                    }
                  />
                  {book.cover.video ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-amber-900/15 bg-black">
                        {book.cover.video.provider === "local" ? (
                          <video
                            src={book.cover.video.url}
                            muted
                            preload="metadata"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-white/70">
                            {book.cover.video.provider}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-gray-700">
                          {book.cover.video.title || t.ed.videoSection}
                        </div>
                        <button
                          onClick={() => {
                            patchCover({ video: null });
                            commitSave();
                          }}
                          className="text-xs text-red-500 hover:text-red-600"
                        >
                          {t.ed.remove}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => coverVideoInputRef.current?.click()}
                        className="rounded-lg border border-dashed border-amber-700/50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-50"
                      >
                        {coverVideoUploading
                          ? t.ed.uploading
                          : t.ed.coverVideoUpload}
                      </button>
                      <div className="flex gap-2">
                        <input
                          value={coverVideoUrl}
                          onChange={(e) => setCoverVideoUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") loadCoverVideoLink();
                          }}
                          placeholder={t.ed.videoLinkPh}
                          className="min-w-0 flex-1 rounded-lg border border-amber-900/20 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600"
                        />
                        <button
                          onClick={loadCoverVideoLink}
                          disabled={!coverVideoUrl.trim()}
                          className="shrink-0 rounded-lg bg-amber-700 px-3 py-2 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
                        >
                          {t.ed.fetch}
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="mt-1 text-[11px] text-amber-900/50">
                    {t.ed.coverVideoHint}
                  </p>
                </div>

                <p className="text-xs text-amber-900/50">
                  {t.ed.theme}: <strong>{theme.name}</strong>
                </p>

                <MusicEditor
                  music={book.music ?? []}
                  onChange={patchMusic}
                  onCommit={commitSave}
                />

                {/* access password */}
                <div className="border-t border-amber-900/10 pt-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={book.viewPassword != null}
                      onChange={(e) => {
                        setViewPassword(
                          e.target.checked ? genPassword() : null,
                          true
                        );
                      }}
                      className="h-4 w-4 accent-amber-700"
                    />
                    <span className="text-sm font-semibold text-amber-950">
                      {t.ed.protect}
                    </span>
                  </label>

                  {book.viewPassword != null && (
                    <div className="mt-3">
                      <div className="flex gap-2">
                        <input
                          value={book.viewPassword}
                          onChange={(e) => setViewPassword(e.target.value)}
                          onBlur={commitSave}
                          placeholder={t.ed.passwordPh}
                          className="min-w-0 flex-1 rounded-lg border border-amber-900/20 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-amber-600"
                        />
                        <button
                          onClick={() => setViewPassword(genPassword(), true)}
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
              </div>
            ) : selected === "end" ? (
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-amber-950">
                  {t.ed.endPageTitle}
                </h2>
                <p className="text-xs text-amber-900/55">{t.ed.endPageHint}</p>
                <PageEditor
                  key="endpage"
                  page={book.cover.endPage ?? EMPTY_END_PAGE}
                  onChange={(patch) => patchPage("end", patch)}
                  onCommit={commitSave}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-amber-950">
                  {t.ed.page} {(selected as number) + 1}
                </h2>
                <PageEditor
                  key={book.pages[selected as number].id}
                  page={book.pages[selected as number]}
                  onChange={(patch) => patchPage(selected as number, patch)}
                  onCommit={commitSave}
                  onImportPdf={(urls) => importPdf(selected as number, urls)}
                />
              </div>
            )}
          </section>

          {/* live preview */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <LivePreview
              content={previewContent}
              theme={theme}
              label={t.ed.livePreview}
              editable={selected !== "cover"}
              onImageMove={(x, y) => {
                const cur = selPageObj?.image;
                if (cur && selRef !== null)
                  patchPage(selRef, { image: { ...cur, x, y } });
              }}
              onImageResize={(size) => {
                const cur = selPageObj?.image;
                if (cur && selRef !== null)
                  patchPage(selRef, { image: { ...cur, scale: size / 100 } });
              }}
              onTextMove={(id, x, y) =>
                selRef !== null && updateTextBlock(selRef, id, { x, y })
              }
              onTextResize={(id, w) =>
                selRef !== null && updateTextBlock(selRef, id, { w })
              }
              onCaptionMove={(x, y) =>
                selRef !== null &&
                patchPage(selRef, { captionX: x, captionY: y })
              }
              onVideoMove={(x, y) => {
                const cur = selPageObj?.video;
                if (cur && selRef !== null)
                  patchPage(selRef, { video: { ...cur, x, y } });
              }}
              onVideoResize={(size) => {
                const cur = selPageObj?.video;
                if (cur && selRef !== null)
                  patchPage(selRef, { video: { ...cur, scale: size / 100 } });
              }}
              onLinkMove={(id, x, y) => {
                if (selRef === null) return;
                const links = (selPageObj?.links ?? []).map((l) =>
                  l.id === id ? { ...l, x, y } : l
                );
                patchPage(selRef, { links });
              }}
              onLinkResize={(id, size) => {
                if (selRef === null) return;
                const links = (selPageObj?.links ?? []).map((l) =>
                  l.id === id ? { ...l, size } : l
                );
                patchPage(selRef, { links });
              }}
              onCommit={commitSave}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
