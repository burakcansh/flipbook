import type { VideoMeta } from "./types";

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export function extractVimeoId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

/**
 * Server-side oEmbed fetch. Runs on the server to avoid browser CORS issues.
 * Falls back to a sensible default when the provider does not respond.
 */
export async function fetchVideoMeta(url: string): Promise<VideoMeta | null> {
  const ytId = extractYouTubeId(url);
  if (ytId) {
    const fallback: VideoMeta = {
      provider: "youtube",
      videoId: ytId,
      url,
      title: "YouTube videosu",
      thumbnail: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
    };
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(
          `https://www.youtube.com/watch?v=${ytId}`
        )}&format=json`,
        { cache: "no-store" }
      );
      if (!res.ok) return fallback;
      const data = (await res.json()) as {
        title?: string;
        thumbnail_url?: string;
      };
      return {
        ...fallback,
        title: data.title || fallback.title,
        thumbnail: data.thumbnail_url || fallback.thumbnail,
      };
    } catch {
      return fallback;
    }
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    const fallback: VideoMeta = {
      provider: "vimeo",
      videoId: vimeoId,
      url,
      title: "Vimeo videosu",
      thumbnail: "",
    };
    try {
      const res = await fetch(
        `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(
          `https://vimeo.com/${vimeoId}`
        )}`,
        { cache: "no-store" }
      );
      if (!res.ok) return fallback;
      const data = (await res.json()) as {
        title?: string;
        thumbnail_url?: string;
      };
      return {
        ...fallback,
        title: data.title || fallback.title,
        thumbnail: data.thumbnail_url || fallback.thumbnail,
      };
    } catch {
      return fallback;
    }
  }

  return null;
}
