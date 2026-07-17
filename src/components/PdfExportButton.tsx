"use client";

import { useEffect, useRef, useState } from "react";
import BookFace, { type FaceContent } from "./BookFace";
import type { Book, BookPage } from "@/lib/types";
import type { Theme } from "@/lib/themes";
import { isPageEmpty } from "@/lib/textBlocks";
import { useT } from "@/lib/LangProvider";

// Render size per PDF page (3:4, matching the book pages).
const W = 900;
const H = 1200;
// html2canvas oversampling — higher = sharper pages (and bigger/slower).
const SCALE = 2;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(label + " zaman aşımı")), ms)
    ),
  ]);
}

function safeName(book: Book): string {
  const raw = (book.cover.name || book.cover.title || "kitap").trim();
  const clean = raw.replace(/[^\p{L}\p{N}_-]+/gu, "_").replace(/^_+|_+$/g, "");
  return clean.slice(0, 60) || "kitap";
}

// Fetch a remote image and return a DOWN-SCALED, compressed data URL. Embedding
// the original multi-MB image as a data URL makes html-to-image choke/hang, so
// we shrink it to a size that's more than enough for the PDF page first.
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () =>
      typeof fr.result === "string" ? resolve(fr.result) : reject();
    fr.onerror = () => reject();
    fr.readAsDataURL(blob);
  });
}

async function urlToDataUrl(url: string, opaque: boolean): Promise<string> {
  let blob: Blob;
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return url;
    blob = await res.blob();
  } catch {
    return url;
  }
  // Preferred path: shrink + recompress so the embedded image is small.
  try {
    const bmp = await createImageBitmap(blob);
    const maxDim = 2000;
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      if (opaque) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(bmp, 0, 0, w, h);
      bmp.close();
      return opaque
        ? canvas.toDataURL("image/jpeg", 0.92)
        : canvas.toDataURL("image/png");
    }
  } catch {
    /* createImageBitmap/canvas unsupported → fall through */
  }
  // Fallback: embed the raw bytes so the image still shows (no dark fallback).
  try {
    return await blobToDataUrl(blob);
  } catch {
    return url;
  }
}

/**
 * Replace every remote image URL in the book with an inline data URL so the
 * snapshot step never has to fetch anything (fast + reliable). Videos are
 * dropped since a PDF is static.
 */
async function inlineBook(book: Book): Promise<Book> {
  const cache = new Map<string, string>();
  const conv = async (
    u: string | null | undefined,
    opaque: boolean
  ): Promise<string | null> => {
    if (!u) return u ?? null;
    if (!/^https?:/i.test(u)) return u; // already inline / relative
    const key = (opaque ? "j:" : "p:") + u;
    if (cache.has(key)) return cache.get(key) as string;
    const d = await urlToDataUrl(u, opaque);
    cache.set(key, d);
    return d;
  };
  const inlinePage = async (p: BookPage): Promise<BookPage> => {
    const np: BookPage = { ...p, video: null };
    if (np.bgImage) np.bgImage = await conv(np.bgImage, true);
    if (np.image?.src) {
      const src = await conv(np.image.src, false);
      if (src) np.image = { ...np.image, src };
    }
    return np;
  };
  const cover = { ...book.cover, video: null };
  if (cover.image) cover.image = await conv(cover.image, true);
  if (cover.endPage) cover.endPage = await inlinePage(cover.endPage);
  const pages = await Promise.all(book.pages.map(inlinePage));
  return { ...book, cover, pages };
}

function buildFaces(book: Book): { key: string; content: FaceContent }[] {
  const faces: { key: string; content: FaceContent }[] = [];
  faces.push({ key: "cover", content: { type: "cover", cover: book.cover } });
  book.pages
    .filter((p) => !isPageEmpty(p))
    .forEach((p, i) =>
      faces.push({
        key: p.id,
        content: { type: "page", page: p, pageNumber: i + 1 },
      })
    );
  if (book.cover.endPage && !isPageEmpty(book.cover.endPage)) {
    faces.push({
      key: "end",
      content: {
        type: "page",
        page: book.cover.endPage,
        pageNumber: book.pages.length + 1,
        isEnd: true,
      },
    });
  }
  return faces;
}

/**
 * Admin-only "download this book as a PDF" button — one PDF page per book page,
 * generated entirely in the browser.
 */
export default function PdfExportButton({
  book,
  theme,
}: {
  book: Book;
  theme: Theme;
}) {
  const t = useT();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState("");
  const [stageBook, setStageBook] = useState<Book | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!exporting) return;
    let cancelled = false;
    (async () => {
      try {
        const inlined = await inlineBook(book);
        if (cancelled) return;
        setStageBook(inlined);
        // let the off-screen faces mount + scale to size
        await new Promise((r) => setTimeout(r, 500));
        if (cancelled) return;
        const [h2c, jspdf] = await Promise.all([
          import("html2canvas"),
          import("jspdf"),
        ]);
        const html2canvas = h2c.default;
        const nodes = Array.from(
          stageRef.current?.querySelectorAll<HTMLElement>("[data-pdf-face]") ?? []
        );
        if (nodes.length === 0) throw new Error("Sayfa bulunamadı");
        const pdf = new jspdf.jsPDF({
          orientation: "portrait",
          unit: "px",
          format: [W, H],
        });
        for (let i = 0; i < nodes.length; i++) {
          setProgress(`${i + 1}/${nodes.length}`);
          const canvas = await withTimeout(
            html2canvas(nodes[i], {
              scale: SCALE,
              backgroundColor: "#ffffff",
              useCORS: true,
              logging: false,
              width: W,
              height: H,
              windowWidth: W,
              windowHeight: H,
            }),
            30000,
            `Sayfa ${i + 1}`
          );
          if (cancelled) return;
          const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
          if (i > 0) pdf.addPage([W, H], "portrait");
          pdf.addImage(dataUrl, "JPEG", 0, 0, W, H);
        }
        pdf.save(`${safeName(book)}.pdf`);
      } catch (e) {
        alert(
          t.editor.pdfFailed +
            ": " +
            (e instanceof Error ? e.message : "?")
        );
      } finally {
        if (!cancelled) {
          setStageBook(null);
          setExporting(false);
          setProgress("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exporting]);

  const faces = stageBook ? buildFaces(stageBook) : [];

  return (
    <>
      <button
        onClick={() => setExporting(true)}
        disabled={exporting}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-white disabled:opacity-60"
        title="Kitabı PDF olarak indir"
      >
        {exporting
          ? `${t.editor.pdfPreparing} ${progress}`
          : t.editor.pdfDownload}
      </button>

      {stageBook && (
        <div
          ref={stageRef}
          aria-hidden
          style={{
            position: "fixed",
            left: -100000,
            top: 0,
            pointerEvents: "none",
          }}
        >
          {faces.map((f) => (
            <div
              key={f.key}
              data-pdf-face
              style={{
                width: W,
                height: H,
                overflow: "hidden",
                background: "#ffffff",
              }}
            >
              <div style={{ width: "100%", height: "100%" }}>
                <BookFace
                  content={f.content}
                  theme={theme}
                  side="right"
                  active={false}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
