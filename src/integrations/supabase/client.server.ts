import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { requireEnv } from "./env";

/**
 * Service-role client. Bypasses row-level security, so it must never be
 * imported from code that can reach the browser bundle — only from
 * `createServerFn` handlers, which are stripped out of the client build.
 */
function createSupabaseAdminClient() {
  return createClient<Database>(
    requireEnv("SUPABASE_URL", "VITE_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

let instance: ReturnType<typeof createSupabaseAdminClient> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get: (_target, prop, receiver) => {
    if (!instance) instance = createSupabaseAdminClient();
    return Reflect.get(instance, prop, receiver);
  },
});
