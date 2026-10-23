import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

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

/**
 * Baseline browser hardening on every response. No Content-Security-Policy:
 * Start's SSR emits inline scripts for hydration, and a CSP strict enough to
 * matter needs per-request nonces threaded through the framework.
 */
const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "cross-origin-opener-policy": "same-origin",
  "strict-transport-security": "max-age=31536000",
};

const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();
  try {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      if (!result.response.headers.has(name)) result.response.headers.set(name, value);
    }
  } catch {
    /* immutable headers on some responses — not worth failing over */
  }
  return result;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeadersMiddleware, errorMiddleware],
}));
