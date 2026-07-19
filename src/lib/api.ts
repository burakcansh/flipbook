"use client";

import type {
  Book,
  BookSummary,
  ThemeKey,
  VideoMeta,
} from "./types";

/** Auth travels in the httpOnly session cookie (sent automatically). */
function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `İstek başarısız (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function listMyBooks(): Promise<BookSummary[]> {
  const res = await fetch("/api/books", {
    headers: jsonHeaders(),
    cache: "no-store",
  });
  const data = await handle<{ books: BookSummary[] }>(res);
  return data.books;
}

export async function createBook(
  opts: {
    themeKey?: ThemeKey;
    templateKey?: string;
    docType?: "book" | "certificate" | "site";
    locale?: "tr" | "en";
  } = {}
): Promise<Book> {
  const res = await fetch("/api/books", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(opts),
  });
  const data = await handle<{ book: Book }>(res);
  return data.book;
}

export async function getBook(id: string): Promise<Book> {
  const res = await fetch(`/api/books/${id}`, {
    headers: jsonHeaders(),
    cache: "no-store",
  });
  const data = await handle<{ book: Book }>(res);
  return data.book;
}

export async function updateBook(
  id: string,
  patch: Partial<
    Pick<Book, "cover" | "pages" | "themeKey" | "music" | "viewPassword">
  >
): Promise<Book> {
  const res = await fetch(`/api/books/${id}`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(patch),
  });
  const data = await handle<{ book: Book }>(res);
  return data.book;
}

export async function deleteBook(id: string): Promise<void> {
  const res = await fetch(`/api/books/${id}`, {
    method: "DELETE",
    headers: jsonHeaders(),
  });
  await handle<{ ok: boolean }>(res);
}

export async function publishBook(
  id: string,
  publish: boolean
): Promise<Book> {
  const res = await fetch(`/api/books/${id}/publish`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ publish }),
  });
  const data = await handle<{ book: Book }>(res);
  return data.book;
}

async function uploadFile(file: File): Promise<{ url: string }> {
  // Ask the server how to upload (Supabase Storage or local file store).
  const info = await fetch("/api/upload-url", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ name: file.name }),
  }).then((r) => r.json());

  if (info?.mode === "supabase") {
    // Upload straight to Supabase Storage (no Vercel body-size limit).
    const { supabaseBrowser } = await import("./supabaseBrowser");
    const { error } = await supabaseBrowser()
      .storage.from("uploads")
      .uploadToSignedUrl(info.path, info.token, file);
    if (error) throw new Error(`Yükleme başarısız: ${error.message}`);
    return { url: info.publicUrl as string };
  }

  // Fallback: local file-based upload endpoint (development).
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await handle<{ url: string; id: string }>(res);
  return { url: data.url };
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  return uploadFile(file);
}

export async function uploadVideo(file: File): Promise<{ url: string }> {
  return uploadFile(file);
}

export async function uploadAudio(file: File): Promise<{ url: string }> {
  return uploadFile(file);
}

export async function uploadHtml(file: File): Promise<{ url: string }> {
  return uploadFile(file);
}

export async function fetchVideoMeta(url: string): Promise<VideoMeta | null> {
  const res = await fetch(`/api/video-meta?url=${encodeURIComponent(url)}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { meta: VideoMeta | null };
  return data.meta;
}
