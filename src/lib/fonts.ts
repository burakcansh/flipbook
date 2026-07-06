export interface FontOption {
  key: string;
  label: string;
  /** css font-family; empty means "use the theme font" */
  css: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { key: "", label: "Varsayılan (tema)", css: "" },
  { key: "display", label: "Zarif", css: "var(--font-display), Georgia, serif" },
  { key: "sans", label: "Modern", css: "var(--font-sans), system-ui, sans-serif" },
  { key: "serif", label: "Klasik", css: "var(--font-serif), Georgia, serif" },
  { key: "mono", label: "Daktilo", css: "ui-monospace, Menlo, monospace" },
  { key: "hand", label: "El yazısı", css: "var(--font-hand), cursive" },
];
