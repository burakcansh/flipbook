// Client-only helper: render every page of a PDF file to a JPEG blob using
// pdf.js. Used to let admins drop a PDF as a page background — each PDF page
// becomes a full-page background image.

export async function pdfToJpegBlobs(
  file: File,
  onProgress?: (done: number, total: number) => void,
  scale = 2
): Promise<Blob[]> {
  const pdfjs = await import("pdfjs-dist");
  // The worker ships with the package; point pdf.js at it (bundled by webpack).
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const blobs: Blob[] = [];

  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      // PDFs are transparent — paint white so the JPEG isn't black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob"))),
          "image/jpeg",
          0.9
        )
      );
      blobs.push(blob);
      onProgress?.(i, doc.numPages);
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }

  return blobs;
}
