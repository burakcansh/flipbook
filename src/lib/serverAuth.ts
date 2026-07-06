import { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "./auth";

/** Reads the authenticated user id from the signed session cookie. */
export function getOwnerIdFromRequest(req: NextRequest): string | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  return verifySession(token);
}
