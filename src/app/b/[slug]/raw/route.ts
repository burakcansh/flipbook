import { NextRequest, NextResponse } from "next/server";
import { getBookBySlug } from "@/lib/db";
import { siteUnlockCookie, siteUnlockToken } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * Serves an uploaded HTML site as a real document (so its in-page anchors,
 * mailto and relative links work). The document is sandboxed via a CSP
 * `sandbox` header — an opaque origin with scripts allowed but no
 * `allow-same-origin`, so it can never read this app's cookies/storage, even
 * if opened directly. It's meant to be embedded by SiteViewer's <iframe>.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const book = await getBookBySlug(params.slug);
  if (
    !book ||
    book.cover.docType !== "site" ||
    book.status !== "published"
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Password-protected → require the unlock cookie set after the gate.
  if (book.viewPassword) {
    const cookie = req.cookies.get(siteUnlockCookie(params.slug))?.value;
    if (cookie !== siteUnlockToken(params.slug)) {
      return new NextResponse("Locked", { status: 401 });
    }
  }

  // Prefer the uploaded file in storage (large HTML isn't kept in the DB);
  // fall back to inline html for older sites.
  let html = book.cover.site?.html ?? "";
  const htmlUrl = book.cover.site?.htmlUrl;
  if (htmlUrl) {
    try {
      const r = await fetch(htmlUrl, { cache: "no-store" });
      if (r.ok) html = await r.text();
    } catch {
      /* keep inline fallback */
    }
  }

  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Sandbox the document itself (opaque origin, scripts ok, no
      // same-origin) and only allow our own pages to frame it.
      "content-security-policy":
        "sandbox allow-scripts allow-popups allow-forms allow-modals allow-presentation allow-popups-to-escape-sandbox; frame-ancestors 'self'",
      "cache-control": "no-store",
    },
  });
}
