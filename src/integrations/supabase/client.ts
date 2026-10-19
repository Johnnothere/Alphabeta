import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Browser/isomorphic Supabase client.
 *
 * Created lazily behind a Proxy so that importing this module during SSR or in
 * a unit test does not throw when env vars are absent — the error only surfaces
 * at first real use, with a message naming the missing variable.
 */
function createSupabaseClient() {
  return createClient<Database>(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    auth: {
      // PKCE is required for the OAuth redirect flow to be safe in a public
      // client, and is what /auth/callback exchanges.
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

let instance: ReturnType<typeof createSupabaseClient> | undefined;

export function getSupabase() {
  if (!instance) instance = createSupabaseClient();
  return instance;
}

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get: (_target, prop, receiver) => Reflect.get(getSupabase(), prop, receiver),
});
