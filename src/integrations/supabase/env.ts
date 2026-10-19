/**
 * Single source of truth for Supabase configuration.
 *
 * Browser bundles can only see `VITE_`-prefixed vars (Vite inlines them at
 * build time), so Railway must have them set as *build* variables too, not
 * just runtime ones. The server falls back to unprefixed names so the service
 * role key never needs a VITE_ twin.
 */

function read(...names: string[]): string | undefined {
  for (const name of names) {
    // import.meta.env is statically replaced by Vite; guard for the server.
    const fromVite = (import.meta.env as Record<string, string | undefined>)[name];
    if (fromVite) return fromVite;
    if (typeof process !== "undefined" && process.env?.[name]) return process.env[name];
  }
  return undefined;
}

export function requireEnv(...names: string[]): string {
  const value = read(...names);
  if (!value) {
    throw new Error(
      `Missing environment variable: ${names.join(" or ")}. ` +
        `Set it in Railway (service variables) and in .env for local development — see .env.example.`,
    );
  }
  return value;
}

export const SUPABASE_URL = () => requireEnv("VITE_SUPABASE_URL", "SUPABASE_URL");
export const SUPABASE_ANON_KEY = () =>
  requireEnv(
    "VITE_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  );
