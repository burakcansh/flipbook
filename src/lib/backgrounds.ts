export interface BgPreset {
  id: string;
  label: string;
  /** a CSS `background` value (multi-layer mesh gradient + glossy sheen) */
  css: string;
}

// A glossy highlight layered on top makes them read as bright / 3D.
const sheen = "linear-gradient(180deg, rgba(255,255,255,0.28), transparent 34%)";

/** Ready-made glossy 3D gradient backgrounds. */
export const BG_LIBRARY: BgPreset[] = [
  {
    id: "ocean",
    label: "Okyanus",
    css: `${sheen}, radial-gradient(at 18% 22%, #67e8f9 0px, transparent 45%), radial-gradient(at 82% 8%, #3b82f6 0px, transparent 45%), radial-gradient(at 25% 90%, #8b5cf6 0px, transparent 45%), linear-gradient(135deg,#0ea5e9,#1e3a8a)`,
  },
  {
    id: "sunset",
    label: "Gün batımı",
    css: `${sheen}, radial-gradient(at 10% 10%, #fda4af 0px, transparent 45%), radial-gradient(at 90% 20%, #fcd34d 0px, transparent 45%), radial-gradient(at 60% 90%, #fb7185 0px, transparent 45%), linear-gradient(135deg,#f97316,#be185d)`,
  },
  {
    id: "grape",
    label: "Mor rüya",
    css: `${sheen}, radial-gradient(at 20% 20%, #c4b5fd 0px, transparent 45%), radial-gradient(at 80% 10%, #f0abfc 0px, transparent 45%), radial-gradient(at 50% 95%, #7c3aed 0px, transparent 50%), linear-gradient(135deg,#6d28d9,#312e81)`,
  },
  {
    id: "emerald",
    label: "Zümrüt",
    css: `${sheen}, radial-gradient(at 15% 15%, #6ee7b7 0px, transparent 45%), radial-gradient(at 85% 25%, #34d399 0px, transparent 45%), radial-gradient(at 50% 90%, #059669 0px, transparent 50%), linear-gradient(135deg,#10b981,#064e3b)`,
  },
  {
    id: "gold",
    label: "Altın lüks",
    css: `${sheen}, radial-gradient(at 20% 15%, #fde68a 0px, transparent 42%), radial-gradient(at 80% 30%, #f59e0b 0px, transparent 45%), linear-gradient(135deg,#78350f,#1c1917)`,
  },
  {
    id: "night",
    label: "Gece",
    css: `${sheen}, radial-gradient(at 25% 15%, #38bdf8 0px, transparent 35%), radial-gradient(at 75% 20%, #818cf8 0px, transparent 35%), radial-gradient(at 50% 85%, #a78bfa 0px, transparent 40%), linear-gradient(160deg,#0f172a,#020617)`,
  },
  {
    id: "peach",
    label: "Şeftali",
    css: `${sheen}, radial-gradient(at 15% 20%, #fecdd3 0px, transparent 50%), radial-gradient(at 85% 15%, #fed7aa 0px, transparent 50%), linear-gradient(135deg,#fda4af,#fdba74)`,
  },
  {
    id: "aurora",
    label: "Aurora",
    css: `${sheen}, radial-gradient(at 10% 30%, #6ee7b7 0px, transparent 40%), radial-gradient(at 90% 20%, #93c5fd 0px, transparent 40%), radial-gradient(at 60% 90%, #c4b5fd 0px, transparent 45%), linear-gradient(135deg,#0f766e,#1e293b)`,
  },
  {
    id: "ruby",
    label: "Yakut",
    css: `${sheen}, radial-gradient(at 20% 18%, #fda4af 0px, transparent 42%), radial-gradient(at 82% 28%, #f43f5e 0px, transparent 45%), linear-gradient(135deg,#9f1239,#450a0a)`,
  },
  {
    id: "graphite",
    label: "Grafit",
    css: `${sheen}, radial-gradient(at 25% 20%, #64748b 0px, transparent 45%), radial-gradient(at 80% 30%, #94a3b8 0px, transparent 40%), linear-gradient(135deg,#334155,#0f172a)`,
  },
];
