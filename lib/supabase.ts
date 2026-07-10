import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service_role key.
// NEVER import this into a Client Component — the key must never reach the browser.
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
