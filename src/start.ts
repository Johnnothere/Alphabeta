import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

/**
 * Baseline browser hardening on every response. No Content-Security-Policy:
 * Start's SSR emits inline scripts for hydration, and a CSP strict enough to
 * matter needs per-request nonces threaded through the framework, which is a
 * change to make deliberately, not as a side effect here.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "cross-origin-opener-policy": "same-origin",
  // Railway terminates TLS at its edge and serves https only, so pinning is
  // safe. No `includeSubDomains`: HSTS is per host, and a custom domain added
  // later may well have subdomains this service knows nothing about.
  "strict-transport-security": "max-age=31536000",
};

const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  try {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      if (!result.response.headers.has(name)) result.response.headers.set(name, value);
    }
  } catch {
    // Some Response objects carry immutable headers (e.g. a static passthrough);
    // missing hardening headers there is not worth failing the request over.
  }
  return result;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  // Outermost first: the headers wrap even the error page.
  requestMiddleware: [securityHeadersMiddleware, errorMiddleware, csrfMiddleware],
}));
