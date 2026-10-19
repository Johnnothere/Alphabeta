import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

/**
 * Registered as a global `functionMiddleware` in `src/start.ts`. Without it the
 * browser never attaches a bearer token to server-function calls and every
 * authenticated serverFn returns 401.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);
