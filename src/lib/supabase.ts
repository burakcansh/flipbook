import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const UPLOAD_BUCKET = "uploads";

/** True when Supabase env vars are set → use Postgres + Storage. */
export const supabaseEnabled = !!(url && serviceKey);

let client: SupabaseClient | null = null;

/** Server-side admin client (service role — bypasses RLS). */
export function supabaseAdmin(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error("Supabase yapılandırılmadı (env eksik).");
  }
  if (!client) {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}

/** Public URL of a file in the uploads bucket. */
export function storagePublicUrl(path: string): string {
  return `${url}/storage/v1/object/public/${UPLOAD_BUCKET}/${path}`;
}
