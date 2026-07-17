import { NextRequest, NextResponse } from "next/server";
import { deleteBook, ensureShareCode, getBook, saveBook } from "@/lib/db";
import { getOwnerIdFromRequest } from "@/lib/serverAuth";
import { isThemeKey } from "@/lib/themes";
import type { Book, BookCover, BookPage, MusicTrack, ThemeKey } from "@/lib/types";

export const dynamic = "force-dynamic";

async function authorize(
  req: NextRequest,
  id: string
): Promise<Book | NextResponse> {
  const ownerId = getOwnerIdFromRequest(req);
  if (!ownerId) {
    return NextResponse.json({ error: "Kimlik bulunamadı" }, { status: 401 });
  }
  const book = await getBook(id);
  if (!book) {
    return NextResponse.json({ error: "Kitap bulunamadı" }, { status: 404 });
  }
  if (book.ownerId !== ownerId) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }
  return book;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await authorize(req, params.id);
  if (result instanceof NextResponse) return result;
  // Backfill a share code for books created before this feature existed.
  if (!result.cover.shareCode) {
    await ensureShareCode(result);
    await saveBook(result);
  }
  return NextResponse.json({ book: result });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await authorize(req, params.id);
  if (result instanceof NextResponse) return result;
  const book = result;

  const patch = (await req.json().catch(() => ({}))) as {
    cover?: BookCover;
    pages?: BookPage[];
    themeKey?: ThemeKey;
    music?: MusicTrack[];
    viewPassword?: string | null;
  };

  if (patch.cover && typeof patch.cover === "object") {
    book.cover = {
      title: String(patch.cover.title ?? ""),
      subtitle: String(patch.cover.subtitle ?? ""),
      name: patch.cover.name ? String(patch.cover.name) : "",
      image: patch.cover.image ? String(patch.cover.image) : null,
      video: patch.cover.video ?? null,
      endPage: patch.cover.endPage ?? null,
      // Never let a client patch drop the stable share code.
      shareCode: patch.cover.shareCode ?? book.cover.shareCode,
      docType: patch.cover.docType ?? book.cover.docType,
      certificate: patch.cover.certificate ?? book.cover.certificate ?? null,
    };
  }
  await ensureShareCode(book);
  if (Array.isArray(patch.pages)) {
    book.pages = patch.pages;
  }
  if (isThemeKey(patch.themeKey)) {
    book.themeKey = patch.themeKey;
  }
  if (Array.isArray(patch.music)) {
    book.music = patch.music;
  }
  if (patch.viewPassword !== undefined) {
    const p =
      typeof patch.viewPassword === "string" ? patch.viewPassword.trim() : "";
    book.viewPassword = p ? p : null;
  }
  book.updatedAt = Date.now();
  await saveBook(book);
  return NextResponse.json({ book });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await authorize(req, params.id);
  if (result instanceof NextResponse) return result;
  await deleteBook(params.id);
  return NextResponse.json({ ok: true });
}
