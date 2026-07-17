const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomString(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Long unique id for books / pages. */
export function genId(prefix = ""): string {
  return `${prefix}${Date.now().toString(36)}${randomString(6)}`;
}

/** Short, shareable slug, e.g. "ab12cd34". */
export function genSlug(): string {
  return randomString(8);
}

/** 5-digit numeric share code shown to readers, e.g. "48213". */
export function genShareCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

/** Readable share password (no ambiguous chars), e.g. "k7m3x9". */
export function genPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
