import { NextRequest, NextResponse } from "next/server";
import { getBook } from "@/lib/db";
import { helperUnlockCookie, helperUnlockToken } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

/** Verify a helper file's password → set the unlock cookie. */
export async function POST(
  req: NextRequest,
  { params }: { params: { bid: string; fid: string } }
) {
  const book = await getBook(params.bid);
  const helper = book?.cover.helperFiles?.find((h) => h.id === params.fid);
  if (!helper) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }
  if (!helper.password) return NextResponse.json({ ok: true });

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if ((body.password ?? "") !== helper.password) {
    return NextResponse.json({ error: "Şifre hatalı" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(
    helperUnlockCookie(params.bid, params.fid),
    helperUnlockToken(params.bid, params.fid),
    { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 }
  );
  return res;
}
