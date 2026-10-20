import { createMiddleware } from "@tanstack/react-start";
import { getRequest, setResponseStatus } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

class Unauthorized extends Error {
  readonly statusCode = 401;
  constructor(message = "Unauthorized") {
    super(message);
  }
}

/**
 * A thrown server-function error is serialised with the response's *current*
 * status, so without setting it first a 401 reached the browser as a generic
 * 500. Called only inside the `.server()` handler: that body is stripped from
 * the client bundle, which is the only place a server-only import may live.
 */
function unauthorized(): never {
  setResponseStatus(401, "Unauthorized");
  throw new Unauthorized();
}

/**
 * Verifies the caller's Supabase access token and exposes an RLS-scoped client.
 *
 * The token comes from the Authorization header that `attachSupabaseAuth` adds
 * in the browser. `getClaims` is what supabase-js recommends over `getUser`:
 * with asymmetric JWT signing keys it verifies the signature locally against a
 * cached JWKS, so this costs no network round trip per call. On a project still
 * using the legacy symmetric secret it silently falls back to a `getUser`
 * request — correct either way, just slower, which is one more reason to move
 * the project to asymmetric signing keys.
 *
 * The trade-off versus `getUser`: a locally verified token stays acceptable
 * until it expires, so a sign-out or ban takes effect within the access token's
 * lifetime rather than instantly. Role changes are not affected — those are
 * read from `user_roles` by row-level security on every query.
 */
export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) unauthorized();

    const token = authHeader.slice("Bearer ".length).trim();
    if (token.split(".").length !== 3) unauthorized();

    const supabase = createClient<Database>(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    const userId = data?.claims?.sub;
    if (error || !userId) unauthorized();

    return next({ context: { supabase, userId, claims: data.claims } });
  },
);
