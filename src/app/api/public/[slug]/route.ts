import { NextRequest, NextResponse } from "next/server";
import { getBookBySlug } from "@/lib/db";
import type { Book, PublicBook } from "@/lib/types";

export const dynamic = "force-dynamic";

function toPublic(book: Book): PublicBook {
  const { ownerId, viewPassword, ...rest } = book;
  void ownerId;
  void viewPassword;
  return rest;
}

// Locked books return only a flag + title until the password is verified.
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const book = await getBookBySlug(params.slug);
  if (!book) {
    return NextResponse.json(
      { error: "Yayında bir kitap bulunamadı" },
      { status: 404 }
    );
  }
  if (book.viewPassword) {
    return NextResponse.json({
      locked: true,
      title: book.cover.title,
      themeKey: book.themeKey,
    });
  }
  return NextResponse.json({ locked: false, book: toPublic(book) });
}

// Verify the password → return the full book.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const book = await getBookBySlug(params.slug);
  if (!book) {
    return NextResponse.json(
      { error: "Yayında bir kitap bulunamadı" },
      { status: 404 }
    );
  }
  if (!book.viewPassword) {
    return NextResponse.json({ book: toPublic(book) });
  }
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if ((body.password ?? "") !== book.viewPassword) {
    return NextResponse.json({ error: "Şifre hatalı" }, { status: 401 });
  }
  return NextResponse.json({ book: toPublic(book) });
}
