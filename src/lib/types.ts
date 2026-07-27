export type ThemeKey =
  | "journal"
  | "corporate"
  | "classic"
  | "artdeco"
  | "botanic"
  | "midnight"
  | "linen"
  | "ottoman";

export type PageKind = "text" | "video" | "image";

export interface VideoMeta {
  provider: "youtube" | "vimeo" | "local";
  /** present for youtube/vimeo; omitted for uploaded local files */
  videoId?: string;
  url: string;
  title: string;
  thumbnail: string;
  /** free position (percent) and width (fraction 0.2–1) on the page */
  x?: number;
  y?: number;
  scale?: number;
}

export type ImageAlign = "left" | "center" | "right";

export interface ImageMeta {
  src: string;
  alt: string;
  /** display width as a fraction of the page width, 0.2–1 */
  scale: number;
  align: ImageAlign;
  /** free position (percent of page, top-left of the block). When set, this
   * overrides the flow layout / align. */
  x?: number;
  y?: number;
}

/** One free-positioned text block on a page (multiple allowed). */
export interface TextBlock {
  id: string;
  body: string;
  x?: number;
  y?: number;
  w?: number; // width percent of page
  fontSize?: number;
  color?: string;
  fontFamily?: string;
}

export interface BookPage {
  id: string;
  kind: PageKind;
  /** multiple free-positioned text blocks */
  texts?: TextBlock[];
  /** legacy single text (migrated to `texts` on edit) */
  heading?: string;
  body?: string;
  /** video content */
  video?: VideoMeta | null;
  /** image content (kind === "image") */
  image?: ImageMeta | null;
  caption?: string;
  /** free position of the text block (percent of page). When set, overrides
   * the default flow layout. */
  textX?: number;
  textY?: number;
  /** free position of the caption block (percent of page) */
  captionX?: number;
  captionY?: number;
  /** clickable social / link badges placed on the page */
  links?: LinkItem[];
  /** text styling (text pages) */
  fontSize?: number; // body px, heading scales from it
  textColor?: string;
  fontFamily?: string; // css font-family; empty = theme default
  /** per-page background */
  bgColor?: string | null;
  bgImage?: string | null;
  /** spread the background across this page + its neighbour (double-page) */
  bgSpread?: boolean;
}

export type LinkPlatform =
  | "facebook"
  | "youtube"
  | "instagram"
  | "linkedin"
  | "x"
  | "custom";

export interface LinkItem {
  id: string;
  platform: LinkPlatform;
  url: string;
  /** custom uploaded logo (platform === "custom") */
  iconSrc?: string | null;
  /** position (percent of page) and width (percent of page) */
  x: number;
  y: number;
  size: number;
}

export interface BookCover {
  title: string;
  subtitle: string;
  /** admin-only label shown in "Kitaplarım" (not printed on the cover) */
  name?: string;
  /** optional full-bleed cover background image */
  image?: string | null;
  /** optional full-bleed cover background video (autoplays muted, loops) */
  video?: VideoMeta | null;
  /** optional editable closing page shown at the very end (replaces "SON") */
  endPage?: BookPage | null;
  /** 5-digit numeric code readers can type to open this book */
  shareCode?: string;
  /** which kind of document this is — a flipbook, certificate, or hosted site */
  docType?: DocType;
  /** certificate config + personnel records (when docType === "certificate") */
  certificate?: Certificate | null;
  /** raw uploaded HTML document (when docType === "site") */
  site?: SiteDoc | null;
  /** collaboration note shown to anyone editing this project */
  notes?: string;
  /** auxiliary HTML files kept as backups (each gets its own preview link) */
  helperFiles?: HelperFile[];
}

/** An auxiliary HTML file attached to a project as a backup/preview only. */
export interface HelperFile {
  id: string;
  name: string;
  /** what this file is for — shown so its purpose is clear */
  note?: string;
  htmlUrl: string;
  /** optional password to view the preview link */
  password?: string | null;
}

export type DocType = "book" | "certificate" | "site";

/** A user-uploaded HTML page hosted as a standalone responsive site. */
export interface SiteDoc {
  /** inline HTML (legacy / small files) — served directly when set */
  html: string;
  /**
   * Storage URL of the uploaded HTML. Preferred for any real upload so the
   * document isn't stored in the DB row (avoids the serverless body limit).
   */
  htmlUrl?: string | null;
  /** original uploaded file name, for display */
  fileName?: string;
  /** media (videos/images) uploaded for use inside the HTML, with public URLs */
  assets?: SiteAsset[];
}

export interface SiteAsset {
  url: string;
  name: string;
  kind: "video" | "image";
}

/** One person the certificate is issued to. */
export interface CertificatePersonnel {
  id: string;
  fullName: string; // Adı Soyadı
  date: string; // Tarih
  trainingType: string; // Eğitim Türü
  trainingSubject: string; // Eğitim Konusu
  company: string; // Şirket Adı
  branch: string; // Şube Adı
}

export type CertificateTemplate = "classic" | "modern" | "minimal";

export interface Certificate {
  title: string; // e.g. "KATILIM SERTİFİKASI"
  subtitle: string; // small line under the title
  /** body wording with placeholders: {ad} {tarih} {tur} {konu} {sirket} {sube} */
  body: string;
  template: CertificateTemplate;
  accent: string; // hex accent colour
  logo?: string | null; // optional logo image
  bgImage?: string | null; // optional uploaded landscape background
  signerName?: string;
  signerTitle?: string;
  personnel: CertificatePersonnel[];
}

export type BookStatus = "draft" | "published";

export interface MusicTrack {
  id: string;
  title: string;
  url: string;
}

export interface Book {
  id: string;
  ownerId: string;
  themeKey: ThemeKey;
  cover: BookCover;
  pages: BookPage[];
  /** background music playlist played in the viewer */
  music?: MusicTrack[];
  /** optional share password; when set the /b link asks for it */
  viewPassword?: string | null;
  status: BookStatus;
  slug: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Shape returned to the public viewer (no owner info, no password). */
export type PublicBook = Omit<Book, "ownerId" | "viewPassword">;

/** Lightweight shape for the "Kitaplarım" list. */
export interface BookSummary {
  id: string;
  title: string;
  /** admin label (falls back to title when empty) */
  name: string;
  themeKey: ThemeKey;
  status: BookStatus;
  slug: string | null;
  updatedAt: number;
  /** document kind — book / certificate / site */
  docType: DocType;
  /** true when a view password is set */
  locked: boolean;
  /** collaboration note (empty when none) */
  note: string;
}

/** A book as shown on the public bookshelf. */
export interface ShelfBook {
  slug: string;
  title: string;
  subtitle: string;
  themeKey: ThemeKey;
  coverImage: string | null;
}

export interface ShelfData {
  ownerName: string;
  books: ShelfBook[];
}
