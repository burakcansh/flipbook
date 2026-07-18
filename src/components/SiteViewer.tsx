"use client";

/**
 * Renders an admin-uploaded HTML document full-screen. The HTML is served as a
 * real document from `/b/[slug]/raw` (not srcDoc) so its in-page anchors,
 * mailto and relative links resolve against a real URL and work. The route
 * also ships a CSP `sandbox` header, so the page runs in an opaque origin and
 * cannot read this app's cookies/storage.
 */
export default function SiteViewer({ src }: { src: string }) {
  return (
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
  );
}
