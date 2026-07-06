import { NextRequest, NextResponse } from "next/server";
import { fetchVideoMeta } from "@/lib/video";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url gerekli" }, { status: 400 });
  }
  const meta = await fetchVideoMeta(url);
  if (!meta) {
    return NextResponse.json(
      { meta: null, error: "Desteklenmeyen veya geçersiz video bağlantısı" },
      { status: 200 }
    );
  }
  return NextResponse.json({ meta });
}
