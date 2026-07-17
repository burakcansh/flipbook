import { NextRequest, NextResponse } from "next/server";
import { ensureShareCode, getBook, saveBook, slugExists } from "@/lib/db";
import { getOwnerIdFromRequest } from "@/lib/serverAuth";
import { genSlug } from "@/lib/ids";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ownerId = getOwnerIdFromRequest(req);
  if (!ownerId) {
    return NextResponse.json({ error: "Kimlik bulunamadı" }, { status: 401 });
  }
  const book = await getBook(params.id);
  if (!book) {
    return NextResponse.json({ error: "Kitap bulunamadı" }, { status: 404 });
  }
  if (book.ownerId !== ownerId) {
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { publish?: boolean };
  const publish = body.publish !== false;

  if (publish) {
    if (!book.slug) {
      let slug = genSlug();
      // Avoid collisions.
      let guard = 0;
      while ((await slugExists(slug)) && guard < 10) {
        slug = genSlug();
        guard++;
      }
      book.slug = slug;
    }
    book.status = "published";
    await ensureShareCode(book);
  } else {
    book.status = "draft";
    // Keep the slug so re-publishing yields the same link.
  }
  book.updatedAt = Date.now();
  await saveBook(book);
  return NextResponse.json({ book });
}
