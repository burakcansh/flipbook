import { genId } from "./ids";
import { getDict, type Locale } from "./i18n";
import type {
  Book,
  BookPage,
  CertificatePersonnel,
  ThemeKey,
} from "./types";

export function createDefaultSite(ownerId: string, locale: Locale = "tr"): Book {
  void locale;
  const now = Date.now();
  return {
    id: genId("b_"),
    ownerId,
    themeKey: "corporate",
    cover: {
      title: "",
      subtitle: "",
      name: "",
      docType: "site",
      site: { html: "", fileName: "" },
    },
    pages: [],
    status: "draft",
    slug: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function blankPersonnel(locale: Locale = "tr"): CertificatePersonnel {
  return {
    id: genId("prs_"),
    fullName: "",
    date: new Date().toLocaleDateString(locale === "en" ? "en-GB" : "tr-TR"),
    trainingType: "",
    trainingSubject: "",
    company: "",
    branch: "",
  };
}

export function createDefaultCertificate(
  ownerId: string,
  locale: Locale = "tr"
): Book {
  const now = Date.now();
  const c = getDict(locale).cert;
  return {
    id: genId("b_"),
    ownerId,
    themeKey: "corporate",
    cover: {
      title: c.defName,
      subtitle: "",
      name: c.defName,
      docType: "certificate",
      certificate: {
        title: c.defTitle,
        subtitle: c.defSubtitle,
        body: c.defBody,
        template: "classic",
        accent: "#b8923f",
        logo: null,
        bgImage: null,
        signerName: "",
        signerTitle: c.defSignerTitle,
        personnel: [blankPersonnel(locale)],
      },
    },
    pages: [],
    status: "draft",
    slug: null,
    createdAt: now,
    updatedAt: now,
  };
}

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
