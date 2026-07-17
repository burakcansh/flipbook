import { NextRequest, NextResponse } from "next/server";
import { getBookByShareCode } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Resolve a 5-digit share code to a published book's slug.
export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = (params.code || "").trim();
  const res = (body: object, status = 200) => {
    const r = NextResponse.json(body, { status });
    r.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    return r;
  };

  if (!/^\d{5}$/.test(code)) {
    return res({ error: "Kod 5 haneli olmalı" }, 400);
  }
  const book = await getBookByShareCode(code);
  if (!book || !book.slug) {
    return res({ error: "Bu koda ait bir kitap bulunamadı" }, 404);
  }
  return res({ slug: book.slug });
}
