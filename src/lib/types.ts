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
