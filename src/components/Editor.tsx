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
import type { Book, BookPage, MusicTrack, TextBlock } from "@/lib/types";

type Selected = "cover" | number;
type SaveState = "idle" | "saving" | "saved" | "error";

export default function Editor({ id }: { id: string }) {
  const router = useRouter();
  useAuth(true);
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
      .catch((e) => setError(e.message || "Kitap yüklenemedi"));
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
    doSave();
  }, [doSave]);

  // Flush pending save when leaving the page.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // ---- mutations (immediate local state → instant live preview) ----
  function patchCover(patch: Partial<Book["cover"]>) {
    setBook((b) => (b ? { ...b, cover: { ...b.cover, ...patch } } : b));
    scheduleSave();
  }

  function patchMusic(music: MusicTrack[]) {
    setBook((b) => (b ? { ...b, music } : b));
    scheduleSave();
  }

  function setViewPassword(pw: string | null) {
    setBook((b) => (b ? { ...b, viewPassword: pw } : b));
    scheduleSave();
  }

  async function handleCoverFile(file?: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    setCoverUploading(true);
    try {
      const { url } = await uploadImage(file);
      patchCover({ image: url });
      commitSave();
    } catch {
      alert("Kapak görseli yüklenemedi.");
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
      alert("Lütfen bir video dosyası seç.");
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
      alert(e instanceof Error ? e.message : "Kapak videosu yüklenemedi.");
    } finally {
      setCoverVideoUploading(false);
    }
  }

  async function loadCoverVideoLink() {
    const url = coverVideoUrl.trim();
    if (!url) return;
    const meta = await fetchVideoMeta(url);
    if (!meta) {
      alert("Bağlantı çözümlenemedi (YouTube/Vimeo linki?).");
      return;
    }
    patchCover({ video: meta });
    commitSave();
    setCoverVideoUrl("");
  }

  /** Writes text blocks, clearing any legacy single-text fields. */
  function setTextBlocks(index: number, blocks: TextBlock[]) {
    setBook((b) => {
      if (!b) return b;
      const pages = b.pages.slice();
      pages[index] = {
        ...pages[index],
        texts: blocks,
        heading: undefined,
        body: undefined,
        textX: undefined,
        textY: undefined,
      };
      return { ...b, pages };
    });
    scheduleSave();
  }

  function updateTextBlock(
    index: number,
    id: string,
    patch: Partial<TextBlock>
  ) {
    const page = book?.pages[index];
    if (!page) return;
    const blocks = getTextBlocks(page).map((t) =>
      t.id === id ? { ...t, ...patch } : t
    );
    setTextBlocks(index, blocks);
  }

  function patchPage(index: number, patch: Partial<BookPage>) {
    setBook((b) => {
      if (!b) return b;
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
    setBook((b) => {
      if (!b) return b;
      const newPage: BookPage =
        kind === "text"
          ? { id: genId("p_"), kind: "text", heading: "", body: "" }
          : kind === "image"
          ? { id: genId("p_"), kind: "image", image: null, caption: "" }
          : { id: genId("p_"), kind: "video", video: null, caption: "" };
      const pages = [...b.pages, newPage];
      setSelected(pages.length - 1);
      return { ...b, pages };
    });
    commitSave();
  }

  function deletePage(index: number) {
    setBook((b) => {
      if (!b) return b;
      const pages = b.pages.filter((_, i) => i !== index);
      return { ...b, pages };
    });
    setSelected((s) =>
      s === "cover" ? s : Math.max(0, Math.min((s as number) - 1, 9999))
    );
    commitSave();
  }

  function movePage(index: number, dir: -1 | 1) {
    setBook((b) => {
      if (!b) return b;
      const target = index + dir;
      if (target < 0 || target >= b.pages.length) return b;
      const pages = b.pages.slice();
      [pages[index], pages[target]] = [pages[target], pages[index]];
      return { ...b, pages };
    });
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
      alert("İşlem başarısız oldu.");
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
      : {
          type: "page",
          page: book.pages[selected as number],
          pageNumber: (selected as number) + 1,
        };

  const saveLabel =
    saveState === "saving"
      ? "Kaydediliyor…"
      : saveState === "saved"
      ? "Kaydedildi ✓"
      : saveState === "error"
      ? "Kaydedilemedi"
      : "";

  return (
    <div className="min-h-screen bg-[#efe6d2]">
      <TopBar activeBookId={book.id} />

      {/* toolbar */}
      <div className="border-b border-amber-900/10 bg-[#f7f1e6]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-amber-950">
              {book.cover.name || book.cover.title || "Adsız kitap"}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                published
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {published ? "Yayında" : "Taslak"}
            </span>
            <span className="text-xs text-amber-900/40">{saveLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            {published && book.slug && (
              <>
                <a
                  href={`/b/${book.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-white"
                >
                  Görüntüle
                </a>
                <button
                  onClick={copyLink}
                  className="rounded-lg border border-amber-700 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50"
                >
                  {copied ? "Kopyalandı ✓" : "Linki kopyala"}
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
                ? "…"
                : published
                ? "Yayından kaldır"
                : "Kaydet ve Link Üret"}
            </button>
          </div>
        </div>
        {published && book.slug && (
          <div className="mx-auto max-w-6xl px-4 pb-3">
            <code className="rounded bg-white px-2 py-1 text-xs text-amber-900/70">
              {shareUrl()}
            </code>
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
              📕 Kapak
            </button>

            <div className="mt-1 text-[11px] uppercase tracking-wider text-amber-900/40">
              Sayfalar
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
                        ? "🖼️ Görsel"
                        : p.video
                        ? `🎬 ${p.video.title || "Video"}`
                        : "Boş sayfa")}
                  </span>
                </button>
                <div className="flex flex-col">
                  <button
                    onClick={() => movePage(i, -1)}
                    disabled={i === 0}
                    className="text-[10px] leading-none text-gray-400 disabled:opacity-30"
                    title="Yukarı"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => movePage(i, 1)}
                    disabled={i === book.pages.length - 1}
                    className="text-[10px] leading-none text-gray-400 disabled:opacity-30"
                    title="Aşağı"
                  >
                    ▼
                  </button>
                </div>
                <button
                  onClick={() => deletePage(i)}
                  className="ml-1 text-xs text-red-400 hover:text-red-600"
                  title="Sil"
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
                ＋ Sayfa Ekle
              </button>
            </div>
          </aside>

          {/* editor form */}
          <section className="rounded-xl border border-amber-900/15 bg-white p-5">
            {selected === "cover" ? (
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-amber-950">
                  Kapak
                </h2>
                <div className="rounded-lg border border-amber-900/10 bg-amber-50/50 p-3">
                  <label className="mb-1 block text-xs font-medium text-amber-900/70">
                    Kitap adı (yalnızca “Kitaplarım”da görünür)
                  </label>
                  <input
                    value={book.cover.name ?? ""}
                    onChange={(e) => patchCover({ name: e.target.value })}
                    onBlur={commitSave}
                    placeholder="örn. Nextviro Tanıtım — Ağustos"
                    className="w-full rounded-lg border border-amber-900/20 bg-white px-3 py-2 outline-none focus:border-amber-600"
                  />
                  <p className="mt-1 text-[11px] text-amber-900/50">
                    Kapakta görünmez; kitaplarını kolay ayırt etmen için.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-amber-900/70">
                    Başlık (kapakta görünür)
                  </label>
                  <input
                    value={book.cover.title}
                    onChange={(e) => patchCover({ title: e.target.value })}
                    onBlur={commitSave}
                    placeholder="Kitap başlığı"
                    className="w-full rounded-lg border border-amber-900/20 bg-white px-3 py-2 text-lg outline-none focus:border-amber-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-amber-900/70">
                    Alt başlık
                  </label>
                  <input
                    value={book.cover.subtitle}
                    onChange={(e) => patchCover({ subtitle: e.target.value })}
                    onBlur={commitSave}
                    placeholder="Alt başlık"
                    className="w-full rounded-lg border border-amber-900/20 bg-white px-3 py-2 outline-none focus:border-amber-600"
                  />
                </div>

                {/* cover image */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-amber-900/70">
                    Kapak görseli
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
                          {coverUploading ? "Yükleniyor…" : "Değiştir"}
                        </button>
                        <button
                          onClick={() => {
                            patchCover({ image: null });
                            commitSave();
                          }}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                        >
                          Kaldır
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
                        {coverUploading
                          ? "Yükleniyor…"
                          : "Kapak görseli ekle (sürükle ya da seç)"}
                      </span>
                      <span className="text-xs text-amber-900/50">
                        Dergi tarzı tam kapama kapak için
                      </span>
                    </div>
                  )}
                </div>

                {/* cover video (autoplay, silent, loop) */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-amber-900/70">
                    Kapak videosu (otomatik, sessiz döngü)
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
                          {book.cover.video.title || "Video"}
                        </div>
                        <button
                          onClick={() => {
                            patchCover({ video: null });
                            commitSave();
                          }}
                          className="text-xs text-red-500 hover:text-red-600"
                        >
                          Kaldır
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
                          ? "Yükleniyor…"
                          : "🎬 Cihazdan video yükle"}
                      </button>
                      <div className="flex gap-2">
                        <input
                          value={coverVideoUrl}
                          onChange={(e) => setCoverVideoUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") loadCoverVideoLink();
                          }}
                          placeholder="YouTube / Vimeo linki"
                          className="min-w-0 flex-1 rounded-lg border border-amber-900/20 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600"
                        />
                        <button
                          onClick={loadCoverVideoLink}
                          disabled={!coverVideoUrl.trim()}
                          className="shrink-0 rounded-lg bg-amber-700 px-3 py-2 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
                        >
                          Getir
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="mt-1 text-[11px] text-amber-900/50">
                    Video, kapağın tam kapama arka planı olur ve sessizce döngüde
                    oynar.
                  </p>
                </div>

                <p className="text-xs text-amber-900/50">
                  Tema: <strong>{theme.name}</strong>
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
                        if (e.target.checked) {
                          setViewPassword(genPassword());
                        } else {
                          setViewPassword(null);
                        }
                        commitSave();
                      }}
                      className="h-4 w-4 accent-amber-700"
                    />
                    <span className="text-sm font-semibold text-amber-950">
                      🔒 Şifre ile koru
                    </span>
                  </label>

                  {book.viewPassword != null && (
                    <div className="mt-3">
                      <div className="flex gap-2">
                        <input
                          value={book.viewPassword}
                          onChange={(e) => setViewPassword(e.target.value)}
                          onBlur={commitSave}
                          placeholder="Şifre"
                          className="min-w-0 flex-1 rounded-lg border border-amber-900/20 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-amber-600"
                        />
                        <button
                          onClick={() => {
                            setViewPassword(genPassword());
                            commitSave();
                          }}
                          className="shrink-0 rounded-lg border border-amber-700 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-50"
                        >
                          Rastgele
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-amber-900/55">
                        Linki açan kişi bu şifreyi girmeden kitabı göremez. Şifreyi
                        paylaşmayı unutma.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-amber-950">
                  Sayfa {(selected as number) + 1}
                </h2>
                <PageEditor
                  key={book.pages[selected as number].id}
                  page={book.pages[selected as number]}
                  onChange={(patch) => patchPage(selected as number, patch)}
                  onCommit={commitSave}
                />
              </div>
            )}
          </section>

          {/* live preview */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <LivePreview
              content={previewContent}
              theme={theme}
              label="Canlı önizleme"
              editable={selected !== "cover"}
              onImageMove={(x, y) => {
                const i = selected as number;
                const cur = book.pages[i]?.image;
                if (cur) patchPage(i, { image: { ...cur, x, y } });
              }}
              onImageResize={(size) => {
                const i = selected as number;
                const cur = book.pages[i]?.image;
                if (cur) patchPage(i, { image: { ...cur, scale: size / 100 } });
              }}
              onTextMove={(id, x, y) =>
                updateTextBlock(selected as number, id, { x, y })
              }
              onTextResize={(id, w) =>
                updateTextBlock(selected as number, id, { w })
              }
              onCaptionMove={(x, y) =>
                patchPage(selected as number, { captionX: x, captionY: y })
              }
              onVideoMove={(x, y) => {
                const i = selected as number;
                const cur = book.pages[i]?.video;
                if (cur) patchPage(i, { video: { ...cur, x, y } });
              }}
              onVideoResize={(size) => {
                const i = selected as number;
                const cur = book.pages[i]?.video;
                if (cur) patchPage(i, { video: { ...cur, scale: size / 100 } });
              }}
              onLinkMove={(id, x, y) => {
                const i = selected as number;
                const links = (book.pages[i]?.links ?? []).map((l) =>
                  l.id === id ? { ...l, x, y } : l
                );
                patchPage(i, { links });
              }}
              onLinkResize={(id, size) => {
                const i = selected as number;
                const links = (book.pages[i]?.links ?? []).map((l) =>
                  l.id === id ? { ...l, size } : l
                );
                patchPage(i, { links });
              }}
              onCommit={commitSave}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
