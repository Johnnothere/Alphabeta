import { getRequest } from "@tanstack/react-start/server";

/**
 * Resolves the client IP for rate limiting.
 *
 * `X-Forwarded-For` is a client-appendable list: the left-most entry is
 * whatever the caller claimed, so trusting it lets an attacker rotate a header
 * value and bypass a per-IP limit entirely. Only the entries *appended by
 * infrastructure we trust* are meaningful, and those sit at the right-hand end.
 *
 * TRUSTED_PROXY_HOPS is how many proxies sit in front of this process. On
 * Railway that is 1 (its edge). Put a CDN in front and it becomes 2. Getting
 * this wrong fails safe in one direction only: too high and everyone shares a
 * bucket (limits get stricter), too low and the limit is bypassable.
 */
const HOPS = Math.max(1, Number(process.env["TRUSTED_PROXY_HOPS"] ?? "1") || 1);

export function clientIp(): string {
  const headers = getRequest()?.headers;
  if (!headers) return "unknown";

  // Single-value headers set by the edge itself cannot be spoofed by the client
  // (the proxy overwrites them), so prefer them when present.
  for (const name of ["cf-connecting-ip", "true-client-ip", "x-real-ip"]) {
    const value = headers.get(name)?.trim();
    if (value) return value;
  }

  const chain = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!chain.length) return "unknown";

  // Count back from the right by the number of hops we trust.
  return chain[Math.max(0, chain.length - HOPS)] ?? "unknown";
}
