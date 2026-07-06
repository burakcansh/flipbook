import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

const TYPE_BY_EXT: Record<string, string> = {
  // images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
  tiff: "image/tiff",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  heic: "image/heic",
  heif: "image/heif",
  // videos
  mp4: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  mkv: "video/x-matroska",
  "3gp": "video/3gpp",
  mpeg: "video/mpeg",
  // audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  oga: "audio/ogg",
  aac: "audio/aac",
  m4a: "audio/mp4",
  flac: "audio/flac",
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  // Hard guard against path traversal — only a plain filename is allowed.
  if (!/^[A-Za-z0-9_]+\.[A-Za-z0-9]{2,5}$/.test(id)) {
    return new NextResponse("Geçersiz dosya", { status: 400 });
  }

  const filePath = path.join(UPLOAD_DIR, id);
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Bulunamadı", { status: 404 });
  }

  const ext = id.split(".").pop()!.toLowerCase();
  const type = TYPE_BY_EXT[ext] ?? "application/octet-stream";
  const isVideo = type.startsWith("video/") || type.startsWith("audio/");
  const stat = fs.statSync(filePath);
  const total = stat.size;

  const range = req.headers.get("range");

  // Range request (video seeking) → serve the requested byte slice only.
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (match) {
      let start = match[1] ? parseInt(match[1], 10) : 0;
      let end = match[2] ? parseInt(match[2], 10) : total - 1;
      if (isNaN(start)) start = 0;
      if (isNaN(end) || end >= total) end = total - 1;
      if (start > end || start >= total) {
        return new NextResponse("Range hatalı", {
          status: 416,
          headers: { "Content-Range": `bytes */${total}` },
        });
      }
      const chunkSize = end - start + 1;
      const fd = fs.openSync(filePath, "r");
      const buffer = Buffer.alloc(chunkSize);
      fs.readSync(fd, buffer, 0, chunkSize, start);
      fs.closeSync(fd);
      return new NextResponse(buffer, {
        status: 206,
        headers: {
          "Content-Type": type,
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  const data = fs.readFileSync(filePath);
  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(total),
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(isVideo ? { "Accept-Ranges": "bytes" } : {}),
      // SVGs can carry scripts — neutralise them when served directly.
      ...(type === "image/svg+xml"
        ? {
            "Content-Security-Policy":
              "default-src 'none'; style-src 'unsafe-inline'",
          }
        : {}),
    },
  });
}
