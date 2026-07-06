"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the browser Supabase client can be used for direct uploads. */
export const supabaseBrowserEnabled = !!(url && anon);

let client: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (!url || !anon) throw new Error("Supabase (browser) yapılandırılmadı.");
  if (!client) client = createClient(url, anon);
  return client;
}
