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
