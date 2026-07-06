import { NextRequest, NextResponse } from "next/server";
import {
  getUserByEmail,
  getUserById,
  saveUser,
  type User,
} from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  signSession,
  isValidEmail,
  isAdminEmail,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/auth";
import { genId } from "@/lib/ids";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    /** old localStorage owner id to migrate books from (first signup only) */
    claimOwnerId?: string;
  };

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Geçerli bir e-posta gir." },
      { status: 400 }
    );
  }
  // Access is restricted to the admin account(s) for now.
  if (!isAdminEmail(email)) {
    return NextResponse.json(
      { error: "Bu sisteme yalnızca yetkili hesap giriş yapabilir." },
      { status: 403 }
    );
  }
  if (password.length < 4) {
    return NextResponse.json(
      { error: "Şifre en az 4 karakter olmalı." },
      { status: 400 }
    );
  }

  let user = await getUserByEmail(email);
  let created = false;

  if (!user) {
    // First time this email is seen → register. The password entered now
    // becomes the account's password (no confirmation/verification).
    const { salt, hash } = hashPassword(password);

    // Preserve books made before signing in: if the browser's old owner id
    // isn't already an account, reuse it as this user's id.
    const claim = body.claimOwnerId?.trim();
    const id =
      claim && !(await getUserById(claim)) ? claim : genId("u_");

    user = {
      id,
      email,
      name: email.split("@")[0],
      salt,
      hash,
      createdAt: Date.now(),
    } satisfies User;
    await saveUser(user);
    created = true;
  } else {
    // Existing account → password must match.
    if (!verifyPassword(password, user.salt, user.hash)) {
      return NextResponse.json({ error: "Şifre hatalı." }, { status: 401 });
    }
  }

  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    created,
  });
  res.cookies.set(SESSION_COOKIE, signSession(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
