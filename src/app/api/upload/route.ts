import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { genId } from "@/lib/ids";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");
const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MB
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|mkv|3gp|ogv|mpe?g)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|oga|aac|m4a|flac)$/i;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|bmp|tiff?|svg|ico|heic|heif)$/i;

const EXT_BY_TYPE: Record<string, string> = {
  // images
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/heic": "heic",
  "image/heif": "heif",
  // videos
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
  "video/x-matroska": "mkv",
  "video/3gpp": "3gp",
  "video/mpeg": "mpeg",
  // audio
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "oga",
  "audio/aac": "aac",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/flac": "flac",
};

function extFor(type: string, name: string): string {
  if (EXT_BY_TYPE[type]) return EXT_BY_TYPE[type];
  const fromName = name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return "img";
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
  }

  // Some browsers report a generic MIME (e.g. application/octet-stream) for
  // valid media, so fall back to the file extension.
  const name = file.name || "";
  const isImage = file.type.startsWith("image/") || IMAGE_EXT.test(name);
  const isVideo = file.type.startsWith("video/") || VIDEO_EXT.test(name);
  const isAudio = file.type.startsWith("audio/") || AUDIO_EXT.test(name);
  if (!isImage && !isVideo && !isAudio) {
    return NextResponse.json(
      { error: "Yalnızca görsel, video veya ses dosyaları yüklenebilir" },
      { status: 415 }
    );
  }
  const limit = isVideo || isAudio ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    return NextResponse.json(
      {
        error: `Dosya çok büyük (en fazla ${Math.round(
          limit / (1024 * 1024)
        )} MB)`,
      },
      { status: 413 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const id = `${genId("img_")}.${extFor(file.type, file.name)}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, id), bytes);

  return NextResponse.json({ id, url: `/api/file/${id}` }, { status: 201 });
}
