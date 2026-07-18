import { NextRequest } from "next/server";
import crypto from "crypto";
import { SESSION_COOKIE, verifySession } from "./auth";

/** Reads the authenticated user id from the signed session cookie. */
export function getOwnerIdFromRequest(req: NextRequest): string | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

const SECRET = process.env.AUTH_SECRET || "flipbook-dev-secret";

/** Cookie name that marks a password-protected site as unlocked. */
export function siteUnlockCookie(slug: string): string {
  return `site_unlock_${slug}`;
}

/** Signed token proving the viewer entered the correct site password. */
export function siteUnlockToken(slug: string): string {
  return crypto.createHmac("sha256", SECRET).update(`site:${slug}`).digest("hex");
}
