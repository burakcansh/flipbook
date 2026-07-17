import type { BookPage, TextBlock } from "./types";

/**
 * Returns the page's text blocks, migrating a legacy single heading/body
 * into one block so old books keep rendering.
 */
export function getTextBlocks(page: BookPage): TextBlock[] {
  if (page.texts && page.texts.length) return page.texts;

  const legacy = [page.heading, page.body].filter(Boolean).join("\n\n").trim();
  if (legacy) {
    return [
      {
        id: "legacy",
        body: legacy,
        x: page.textX,
        y: page.textY,
        fontSize: page.fontSize,
        color: page.textColor,
        fontFamily: page.fontFamily,
      },
    ];
  }
  return [];
}

/**
 * A page is "empty" when it carries no visible content at all: no text,
 * no image/video, no background, no links or caption. Such pages would
 * render as a blank white sheet in the viewer, so we skip them there.
 */
export function isPageEmpty(page: BookPage): boolean {
  const hasText = getTextBlocks(page).some((t) => (t.body || "").trim().length > 0);
  return !(
    hasText ||
    !!page.image?.src ||
    !!page.video ||
    !!page.bgImage ||
    !!page.bgColor ||
    (page.links?.length ?? 0) > 0 ||
    !!(page.caption && page.caption.trim())
  );
}
