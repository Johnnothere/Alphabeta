/**
 * Canonical public origin and build identity. Both are fixed at build time
 * (see vite.config.ts): on Railway they come from RAILWAY_PUBLIC_DOMAIN and
 * RAILWAY_GIT_COMMIT_SHA, locally from .env or the defaults below.
 */
export const SITE_URL = (import.meta.env["VITE_SITE_URL"] ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

/** Build identifier shown in the hero and footer. */
export const HASH = (import.meta.env["VITE_BUILD_SHA"] ?? "dev").slice(0, 7);
export const VERSION = import.meta.env["VITE_APP_VERSION"] ?? "0.2.0";

export const SITE_NAME = "Alphabeta";
export const SITE_TITLE = "Alphabeta — a society of builders";
export const SITE_DESCRIPTION =
  "Alphabeta is a cross-disciplinary community of builders in London, based at the University of Greenwich and open to every institution. No fuss, no hype — we ship, and we help others ship.";
export const SITE_REPO = "https://github.com/Johnnothere/Alphabeta";
