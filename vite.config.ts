import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { fileURLToPath } from "node:url";

/**
 * Replaces Lovable's `@lovable.dev/vite-tanstack-config` wrapper, which bundled
 * these plugins and defaulted the Nitro target to Cloudflare Workers.
 *
 * Plugin order matters: React's plugin must come after TanStack Start's.
 */
export default defineConfig({
  server: { port: 3000 },

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
