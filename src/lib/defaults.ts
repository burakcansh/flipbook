import { genId } from "./ids";
import type { Book, BookPage, ThemeKey } from "./types";

export function blankTextPage(): BookPage {
  return {
    id: genId("p_"),
    kind: "text",
    heading: "",
    body: "",
  };
}

export function blankVideoPage(): BookPage {
  return {
    id: genId("p_"),
    kind: "video",
    video: null,
    caption: "",
  };
}

export function blankImagePage(): BookPage {
  return {
    id: genId("p_"),
    kind: "image",
    image: null,
    caption: "",
  };
}

export function createDefaultBook(ownerId: string, themeKey: ThemeKey): Book {
  const now = Date.now();
  const journal = themeKey === "journal";
  return {
    id: genId("b_"),
    ownerId,
    themeKey,
    cover: {
      title: journal ? "Yolculuk Defterim" : "Sunum Başlığı",
      subtitle: journal ? "küçük bir gezi günlüğü" : "Alt başlık",
    },
    pages: [
      {
        id: genId("p_"),
        kind: "text",
        heading: journal ? "İlk Gün" : "Giriş",
        body: journal
          ? "Sabah erkenden yola çıktık. Hava berraktı, deniz kokusu her yeri sarmıştı..."
          : "Bu sunum hakkında kısa bir giriş yazısı.",
      },
      blankTextPage(),
    ],
    status: "draft",
    slug: null,
    createdAt: now,
    updatedAt: now,
  };
}
