import { NextRequest, NextResponse } from "next/server";
import { getBook } from "@/lib/db";
import { helperUnlockCookie, helperUnlockToken } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** Serves an auxiliary (helper) HTML file's document, sandboxed via CSP. */
export async function GET(
  req: NextRequest,
  { params }: { params: { bid: string; fid: string } }
) {
  const book = await getBook(params.bid);
  const helper = book?.cover.helperFiles?.find((h) => h.id === params.fid);
  if (!helper) return new NextResponse("Not found", { status: 404 });

  if (helper.password) {
    const cookie = req.cookies.get(
      helperUnlockCookie(params.bid, params.fid)
    )?.value;
    if (cookie !== helperUnlockToken(params.bid, params.fid)) {
      return new NextResponse("Locked", { status: 401 });
    }
  }

  let html = "";
  try {
    const r = await fetch(helper.htmlUrl, { cache: "no-store" });
    if (r.ok) html = await r.text();
  } catch {
    /* ignore */
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy":
        "sandbox allow-scripts allow-popups allow-forms allow-modals allow-presentation allow-popups-to-escape-sandbox; frame-ancestors 'self'",
      "cache-control": "no-store",
    },
  });
}
