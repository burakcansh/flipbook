import crypto from "crypto";

/**
 * Minimal, dependency-free auth primitives:
 * - scrypt password hashing (salted)
 * - HMAC-signed stateless session token stored in an httpOnly cookie
 *
 * NOTE: this is a demo. There is no email verification — the first password
 * entered for a new email becomes that account's password.
 */

const SECRET =
  process.env.AUTH_SECRET || "flipbook-dev-insecure-secret-change-me";

export const SESSION_COOKIE = "flipbook_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 60; // 60 days

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPassword(
  password: string,
  salt: string,
  hash: string
): boolean {
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signSession(userId: string): string {
  const sig = crypto.createHmac("sha256", SECRET).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

export function verifySession(token: string | undefined): string | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const userId = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(userId)
    .digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  try {
    return crypto.timingSafeEqual(a, b) ? userId : null;
  } catch {
    return null;
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Only these emails may log in (comma-separated ADMIN_EMAILS env). */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "info@nextviro.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
