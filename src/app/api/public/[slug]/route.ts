import { NextRequest, NextResponse } from "next/server";
import { getBookBySlug } from "@/lib/db";
import type { Book, PublicBook } from "@/lib/types";
import { siteUnlockCookie, siteUnlockToken } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

function toPublic(book: Book): PublicBook {
  const { ownerId, viewPassword, ...rest } = book;
  void ownerId;
  void viewPassword;
  return rest;
}

// Always serve the freshest book — never let a browser/CDN cache the reply, so
// a reader who reopens a shared link sees the latest edits immediately.
function fresh(res: NextResponse): NextResponse {
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

// Locked books return only a flag + title until the password is verified.
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const book = await getBookBySlug(params.slug);
  if (!book) {
    return fresh(
      NextResponse.json({ error: "Yayında bir kitap bulunamadı" }, { status: 404 })
    );
  }
  if (book.viewPassword) {
    return fresh(
      NextResponse.json({
        locked: true,
        title: book.cover.title,
        themeKey: book.themeKey,
      })
    );
  }
  return fresh(NextResponse.json({ locked: false, book: toPublic(book) }));
}

// Verify the password → return the full book.
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const book = await getBookBySlug(params.slug);
  if (!book) {
    return fresh(
      NextResponse.json({ error: "Yayında bir kitap bulunamadı" }, { status: 404 })
    );
  }
  if (!book.viewPassword) {
    return fresh(NextResponse.json({ book: toPublic(book) }));
  }
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if ((body.password ?? "") !== book.viewPassword) {
    return fresh(NextResponse.json({ error: "Şifre hatalı" }, { status: 401 }));
  }
  const res = fresh(NextResponse.json({ book: toPublic(book) }));
  // For hosted sites, mark this slug as unlocked so /b/[slug]/raw will serve
  // the document to this viewer.
  if (book.cover.docType === "site") {
    res.cookies.set(siteUnlockCookie(params.slug), siteUnlockToken(params.slug), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  }
  return res;
}
