import { NextRequest, NextResponse } from "next/server";
import { listBooksByOwner, saveBook } from "@/lib/db";
import { getOwnerIdFromRequest } from "@/lib/serverAuth";
import { createDefaultBook } from "@/lib/defaults";
import { createBookFromTemplate } from "@/lib/templates";
import { isThemeKey } from "@/lib/themes";
import type { BookSummary, ThemeKey } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ownerId = getOwnerIdFromRequest(req);
  if (!ownerId) return NextResponse.json({ books: [] });

  const books = await listBooksByOwner(ownerId);
  const summaries: BookSummary[] = books.map((b) => ({
    id: b.id,
    title: b.cover.title || "Adsız kitap",
    themeKey: b.themeKey,
    status: b.status,
    slug: b.slug,
    updatedAt: b.updatedAt,
  }));
  return NextResponse.json({ books: summaries });
}

export async function POST(req: NextRequest) {
  const ownerId = getOwnerIdFromRequest(req);
  if (!ownerId) {
    return NextResponse.json({ error: "Kimlik bulunamadı" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    themeKey?: ThemeKey;
    templateKey?: string;
  };

  let book = null;
  if (body.templateKey) {
    book = createBookFromTemplate(ownerId, body.templateKey);
  }
  if (!book) {
    const themeKey: ThemeKey = isThemeKey(body.themeKey)
      ? body.themeKey
      : "journal";
    book = createDefaultBook(ownerId, themeKey);
  }

  await saveBook(book);
  return NextResponse.json({ book }, { status: 201 });
}
