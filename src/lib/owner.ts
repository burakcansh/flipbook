"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

const LEGACY_OWNER_KEY = "flipbook.ownerId";

/** Old (pre-auth) anonymous owner id, if this browser has one. Used once to
 * migrate books made before signing in to the newly created account. */
function getClaimOwnerId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(LEGACY_OWNER_KEY) ?? undefined;
}

export async function login(
  email: string,
  password: string
): Promise<{ user: AuthUser; created: boolean }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      claimOwnerId: getClaimOwnerId(),
    }),
  });
  if (!res.ok) {
    let message = "Giriş başarısız.";
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  // Migration done server-side; drop the legacy key so it isn't reused.
  if (typeof window !== "undefined")
    window.localStorage.removeItem(LEGACY_OWNER_KEY);
  return (await res.json()) as { user: AuthUser; created: boolean };
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function fetchMe(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: AuthUser | null };
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Auth state hook. `user === undefined` means still loading.
 * When `requireAuth` is true, redirects to "/" if there is no session.
 */
export function useAuth(requireAuth = false): {
  user: AuthUser | null | undefined;
  loading: boolean;
} {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    fetchMe().then((u) => {
      if (!active) return;
      setUser(u);
      if (requireAuth && !u) router.replace("/");
    });
    return () => {
      active = false;
    };
  }, [requireAuth, router]);

  return { user, loading: user === undefined };
}
