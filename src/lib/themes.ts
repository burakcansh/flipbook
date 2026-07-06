import type { ThemeKey } from "./types";

export type CoverStyle =
  | "ornate"
  | "modern"
  | "classic"
  | "artdeco"
  | "botanic"
  | "midnight"
  | "linen"
  | "ottoman";

export interface Theme {
  key: ThemeKey;
  name: string;
  tagline: string;
  colors: {
    paper: string;
    paperEdge: string;
    ink: string;
    inkSoft: string;
    cover: string;
    coverAccent: string;
    coverText: string;
    spine: string;
    accent: string;
  };
  fonts: {
    display: string;
    body: string;
    mono: string;
  };
  style: {
    coverStyle: CoverStyle;
    /** true = dark decorative cover (light text), false = light cover */
    darkCover: boolean;
    paperTexture: boolean;
  };
}

const SERIF_DISPLAY = "var(--font-display), Georgia, 'Times New Roman', serif";
const SERIF_BODY = "var(--font-serif), Georgia, Cambria, serif";
const SANS =
  "var(--font-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, Menlo, monospace";

export const THEMES: Record<ThemeKey, Theme> = {
  journal: {
    key: "journal",
    name: "Gezgin'in Günlüğü",
    tagline: "Deri kapak, eskitilmiş kâğıt, sıcak tonlar",
    colors: {
      paper: "#f3e9d2",
      paperEdge: "#d9c9a3",
      ink: "#3b2f24",
      inkSoft: "#6b5a45",
      cover: "#5b3a24",
      coverAccent: "#c8a24a",
      coverText: "#f1e3c4",
      spine: "rgba(40,24,12,0.55)",
      accent: "#9a6a35",
    },
    fonts: { display: SERIF_DISPLAY, body: SERIF_BODY, mono: MONO },
    style: { coverStyle: "ornate", darkCover: true, paperTexture: true },
  },
  corporate: {
    key: "corporate",
    name: "Kurumsal Sunum",
    tagline: "Sade, modern, net tipografi",
    colors: {
      paper: "#ffffff",
      paperEdge: "#e6e8ec",
      ink: "#1f2937",
      inkSoft: "#6b7280",
      cover: "#0f172a",
      coverAccent: "#3b82f6",
      coverText: "#f8fafc",
      spine: "rgba(15,23,42,0.35)",
      accent: "#2563eb",
    },
    fonts: { display: SANS, body: SANS, mono: MONO },
    style: { coverStyle: "modern", darkCover: true, paperTexture: false },
  },
  classic: {
    key: "classic",
    name: "Klasik Ciltli",
    tagline: "Bordo deri, altın çerçeve ve köşe süsleri",
    colors: {
      paper: "#f5ecd8",
      paperEdge: "#ddceb0",
      ink: "#3a2418",
      inkSoft: "#6d5340",
      cover: "#5e1f28",
      coverAccent: "#c9a34a",
      coverText: "#f2e4c4",
      spine: "rgba(45,12,16,0.6)",
      accent: "#8a3b2e",
    },
    fonts: { display: SERIF_DISPLAY, body: SERIF_BODY, mono: MONO },
    style: { coverStyle: "classic", darkCover: true, paperTexture: true },
  },
  artdeco: {
    key: "artdeco",
    name: "Art Deco",
    tagline: "Siyah & altın, geometrik zarafet",
    colors: {
      paper: "#f4efe3",
      paperEdge: "#ddd6c4",
      ink: "#2a2419",
      inkSoft: "#6b6350",
      cover: "#14110f",
      coverAccent: "#d4af37",
      coverText: "#f5e9c8",
      spine: "rgba(0,0,0,0.6)",
      accent: "#a9862c",
    },
    fonts: { display: SERIF_DISPLAY, body: SANS, mono: MONO },
    style: { coverStyle: "artdeco", darkCover: true, paperTexture: false },
  },
  botanic: {
    key: "botanic",
    name: "Botanik",
    tagline: "Koyu yeşil cilt, ince altın hatlar",
    colors: {
      paper: "#eef1e6",
      paperEdge: "#cfd7bf",
      ink: "#24352a",
      inkSoft: "#566a58",
      cover: "#1f3b2c",
      coverAccent: "#c2a253",
      coverText: "#eaf0dc",
      spine: "rgba(10,28,18,0.55)",
      accent: "#40694a",
    },
    fonts: { display: SERIF_BODY, body: SERIF_BODY, mono: MONO },
    style: { coverStyle: "botanic", darkCover: true, paperTexture: true },
  },
  midnight: {
    key: "midnight",
    name: "Gece",
    tagline: "Yıldızlı gece laciverti, modern",
    colors: {
      paper: "#eef0f7",
      paperEdge: "#d4d8e6",
      ink: "#232741",
      inkSoft: "#5b6079",
      cover: "#171a3a",
      coverAccent: "#9db0ff",
      coverText: "#e7eaff",
      spine: "rgba(6,8,26,0.6)",
      accent: "#4657b8",
    },
    fonts: { display: SANS, body: SANS, mono: MONO },
    style: { coverStyle: "midnight", darkCover: true, paperTexture: false },
  },
  linen: {
    key: "linen",
    name: "Keten",
    tagline: "Açık keten kapak, minimal ve sıcak",
    colors: {
      paper: "#f6f0e2",
      paperEdge: "#e0d7c2",
      ink: "#4a4234",
      inkSoft: "#8a7f6a",
      cover: "#e6dcc6",
      coverAccent: "#a8916a",
      coverText: "#4a4234",
      spine: "rgba(120,104,74,0.4)",
      accent: "#8a7550",
    },
    fonts: { display: SERIF_BODY, body: SERIF_BODY, mono: MONO },
    style: { coverStyle: "linen", darkCover: false, paperTexture: true },
  },
  ottoman: {
    key: "ottoman",
    name: "Antika Cilt",
    tagline: "Osmanlı tezhibi — altın şemse ve köşebent",
    colors: {
      paper: "#f1e6cc",
      paperEdge: "#dcc79a",
      ink: "#3a2a17",
      inkSoft: "#6f5636",
      cover: "#432818",
      coverAccent: "#b8923f",
      coverText: "#f0dfae",
      spine: "rgba(30,16,8,0.6)",
      accent: "#8a6a2f",
    },
    fonts: { display: SERIF_DISPLAY, body: SERIF_BODY, mono: MONO },
    style: { coverStyle: "ottoman", darkCover: true, paperTexture: true },
  },
};

export function getTheme(key: ThemeKey | string | undefined): Theme {
  if (key && key in THEMES) return THEMES[key as ThemeKey];
  return THEMES.journal;
}

export function isThemeKey(key: unknown): key is ThemeKey {
  return typeof key === "string" && key in THEMES;
}

export const THEME_LIST = Object.values(THEMES);
