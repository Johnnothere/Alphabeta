import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { fileURLToPath } from "node:url";

/**
 * A build-time value is usable only if it is set, and is not a placeholder or
 * an unresolved Railway reference. `${{RAILWAY_GIT_COMMIT_SHA}}` is the trap:
 * Railway's `${{...}}` syntax resolves *user* variables only, so referencing a
 * system variable that way silently produces nothing.
 */
function usable(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v || v.includes("${{") || /your-domain|\.example\b|^dev$/i.test(v)) return undefined;
  return v;
}

// Railway injects these into every build triggered from GitHub, so the commit
// and public origin need no manual configuration. An explicit VITE_* value
// still wins, for local builds or a custom domain.
const BUILD_SHA =
  usable(process.env["VITE_BUILD_SHA"]) ?? usable(process.env["RAILWAY_GIT_COMMIT_SHA"]) ?? "dev";

const SITE_URL =
  usable(process.env["VITE_SITE_URL"]) ??
  (usable(process.env["RAILWAY_PUBLIC_DOMAIN"])
    ? `https://${process.env["RAILWAY_PUBLIC_DOMAIN"]}`
    : undefined) ??
  "http://localhost:3000";

/**
 * Replaces Lovable's `@lovable.dev/vite-tanstack-config` wrapper, which bundled
 * these plugins and defaulted the Nitro target to Cloudflare Workers.
 *
 * Plugin order matters: React's plugin must come after TanStack Start's.
 */
export default defineConfig({
  server: { port: 3000 },

  define: {
    "import.meta.env.VITE_BUILD_SHA": JSON.stringify(BUILD_SHA),
    "import.meta.env.VITE_SITE_URL": JSON.stringify(SITE_URL),
  },

  resolve: {
    // Vite 8 resolves tsconfig `paths` natively. It is still marked
    // experimental, and this tsconfig declares `paths` without `baseUrl`, so
    // the explicit alias below is kept as a fallback.
    tsconfigPaths: true,
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  plugins: [
    tailwindcss(),
    tanstackStart({ srcDirectory: "src" }),
    viteReact(),
    // Preset set explicitly: Nitro would default to `node-server` here anyway,
    // but the Lovable wrapper defaulted to `cloudflare`, so being explicit is
    // what stops that coming back. Builds a self-contained `.output/`.
    nitro({ preset: "node-server" }),
  ],
});
