"use client";

/**
 * Renders an admin-uploaded HTML document full-screen inside a sandboxed
 * iframe. `srcDoc` + a sandbox without `allow-same-origin` keeps the uploaded
 * page isolated from the app's origin (it can't read our cookies/storage) and
 * stops its CSS from leaking into the app.
 */
export default function SiteViewer({ html }: { html: string }) {
  return (
    <iframe
      title="site"
      srcDoc={html}
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
