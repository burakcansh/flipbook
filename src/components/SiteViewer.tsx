"use client";

import MusicPlayer from "./MusicPlayer";
import type { MusicTrack } from "@/lib/types";

/**
 * Renders an admin-uploaded HTML document full-screen. The HTML is served as a
 * real document from `/b/[slug]/raw` (not srcDoc) so its in-page anchors,
 * mailto and relative links resolve against a real URL and work. The route
 * also ships a CSP `sandbox` header, so the page runs in an opaque origin and
 * cannot read this app's cookies/storage. An optional background-music player
 * floats in the top-right corner and tries to autoplay on open.
 */
export default function SiteViewer({
  src,
  music = [],
}: {
  src: string;
  music?: MusicTrack[];
}) {
  return (
    <>
      <iframe
        title="site"
        src={src}
        sandbox="allow-scripts allow-popups allow-forms allow-modals allow-presentation allow-popups-to-escape-sandbox"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          border: "none",
          background: "#fff",
        }}
      />
      {music.length > 0 && (
        <MusicPlayer tracks={music} autoPlay variant="site" />
      )}
    </>
  );
}
