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
 * Railway that is 1 (its edge, which appends to the chain — measured, and
 * confirmed by Railway staff as the trustworthy value). Put a CDN in front and
 * it becomes 2. Getting this wrong fails safe in one direction only: too high
 * and everyone shares a bucket (limits get stricter), too low and the limit is
 * bypassable.
 *
 * Single-value headers such as `CF-Connecting-IP`, `True-Client-IP` or
 * `X-Real-IP` are only trustworthy when the edge in front of us *overwrites*
 * them. Railway does not set the first two at all — they pass straight through
 * from the caller — and has had a bug where a caller's `X-Real-IP` survived
 * alongside the edge's copy. So none of them is trusted by default. If you put
 * a proxy in front that does overwrite one, name it in TRUSTED_IP_HEADER (for
 * Cloudflare, `cf-connecting-ip`) and it will be preferred.
 */
const HOPS = Math.max(1, Number(process.env["TRUSTED_PROXY_HOPS"] ?? "1") || 1);
const TRUSTED_HEADER = (process.env["TRUSTED_IP_HEADER"] ?? "").trim().toLowerCase();

export function clientIp(): string {
  const headers = getRequest()?.headers;
  if (!headers) return "unknown";

  if (TRUSTED_HEADER) {
    // A header the edge overwrites can still arrive doubled if the edge
    // appends rather than replaces; the edge's copy is then the last one.
    const value = headers.get(TRUSTED_HEADER);
    if (value) {
      const parts = value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      const last = parts[parts.length - 1];
      if (last) return last;
    }
  }

  const chain = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!chain.length) return "unknown";

  // Count back from the right by the number of hops we trust. A chain shorter
  // than that means fewer trusted proxies touched the request than expected
  // (a direct hit on the origin, or a misconfigured hop count): the entries
  // that remain are caller-supplied, so rather than fall back to the left-most
  // one — which is exactly the spoofable value — treat the caller as unknown
  // and let it share the anonymous bucket. Too high a hop count therefore
  // fails closed, never open.
  const index = chain.length - HOPS;
  return index >= 0 ? (chain[index] ?? "unknown") : "unknown";
}
