import { NextRequest, NextResponse } from "next/server";
import { getOwnerIdFromRequest } from "@/lib/serverAuth";
import {
  supabaseEnabled,
  supabaseAdmin,
  storagePublicUrl,
  UPLOAD_BUCKET,
} from "@/lib/supabase";
import { genId } from "@/lib/ids";

export const dynamic = "force-dynamic";

// Returns a signed URL so the browser can upload directly to Supabase Storage
// (bypasses Vercel's 4.5 MB function body limit). Falls back to the local
// file-based /api/upload route when Supabase isn't configured.
export async function POST(req: NextRequest) {
  const ownerId = getOwnerIdFromRequest(req);
  if (!ownerId) {
    return NextResponse.json({ error: "Kimlik bulunamadı" }, { status: 401 });
  }

  if (!supabaseEnabled) {
    return NextResponse.json({ mode: "server" });
  }

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const ext =
    (body.name?.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "bin";
  const filePath = `${genId("f_")}.${ext}`;

  const { data, error } = await supabaseAdmin()
    .storage.from(UPLOAD_BUCKET)
    .createSignedUploadUrl(filePath);

  if (error || !data) {
    return NextResponse.json(
      { error: "Yükleme adresi alınamadı" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    mode: "supabase",
    path: data.path,
    token: data.token,
    publicUrl: storagePublicUrl(filePath),
  });
}
