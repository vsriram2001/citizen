import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for trusted server-side code only (API routes, server
// actions). Bypasses RLS — never import this into client components.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
