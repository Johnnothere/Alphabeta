import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The rate limiter is only as good as its idea of "who". X-Forwarded-For is a
 * list the caller can prepend to, so the left-most entry is attacker-supplied;
 * these tests pin the behaviour that we count back from the right instead, and
 * that single-value headers are ignored unless explicitly trusted.
 */
function loadClientIp(hops: string, headers: Record<string, string>, trustedHeader?: string) {
  vi.resetModules();
  process.env["TRUSTED_PROXY_HOPS"] = hops;
  if (trustedHeader) process.env["TRUSTED_IP_HEADER"] = trustedHeader;
  vi.doMock("@tanstack/react-start/server", () => ({
    getRequest: () => ({ headers: new Headers(headers) }),
  }));
  return import("@/lib/client-ip").then((m) => m.clientIp());
}

afterEach(() => {
  delete process.env["TRUSTED_PROXY_HOPS"];
  delete process.env["TRUSTED_IP_HEADER"];
  vi.doUnmock("@tanstack/react-start/server");
});

describe("clientIp", () => {
  it("takes the entry the trusted proxy appended, not the one the caller claimed", async () => {
    // A caller sending "X-Forwarded-For: 1.1.1.1" gets it prepended; the edge
    // appends the real peer. With one trusted hop, the real peer is last.
    await expect(loadClientIp("1", { "x-forwarded-for": "1.1.1.1, 203.0.113.9" })).resolves.toBe(
      "203.0.113.9",
    );
  });

  it("ignores a spoofed chain entirely when every entry is forged", async () => {
    await expect(
      loadClientIp("1", { "x-forwarded-for": "9.9.9.9, 8.8.8.8, 203.0.113.9" }),
    ).resolves.toBe("203.0.113.9");
  });

  it("counts back further when more proxies are trusted", async () => {
    await expect(
      loadClientIp("2", { "x-forwarded-for": "1.1.1.1, 203.0.113.9, 10.0.0.1" }),
    ).resolves.toBe("203.0.113.9");
  });

  it("fails closed when the chain is shorter than the trusted hop count", async () => {
    // Fewer proxies touched the request than configured, so every remaining
    // entry is caller-supplied. Falling back to the left-most one would hand
    // the attacker the bucket key; the shared "unknown" bucket is the safe
    // answer.
    await expect(loadClientIp("5", { "x-forwarded-for": "203.0.113.9" })).resolves.toBe("unknown");
    await expect(loadClientIp("2", { "x-forwarded-for": "1.1.1.1, 203.0.113.9" })).resolves.toBe(
      "1.1.1.1",
    );
  });

  it("does not trust caller-supplied single-value headers by default", async () => {
    // Railway forwards CF-Connecting-IP / True-Client-IP untouched, so a caller
    // can set them to anything. They must not override the forwarded chain.
    await expect(
      loadClientIp("1", {
        "cf-connecting-ip": "1.2.3.4",
        "true-client-ip": "5.6.7.8",
        "x-real-ip": "9.9.9.9",
        "x-forwarded-for": "1.1.1.1, 203.0.113.9",
      }),
    ).resolves.toBe("203.0.113.9");
  });

  it("prefers an explicitly trusted single-value header", async () => {
    await expect(
      loadClientIp(
        "1",
        { "cf-connecting-ip": "203.0.113.5", "x-forwarded-for": "1.1.1.1, 9.9.9.9" },
        "cf-connecting-ip",
      ),
    ).resolves.toBe("203.0.113.5");
  });

  it("takes the last copy when the trusted header arrives doubled", async () => {
    await expect(
      loadClientIp("1", { "x-real-ip": "1.1.1.1, 203.0.113.5" }, "x-real-ip"),
    ).resolves.toBe("203.0.113.5");
  });

  it("falls back to the chain when the trusted header is absent", async () => {
    await expect(
      loadClientIp("1", { "x-forwarded-for": "1.1.1.1, 203.0.113.9" }, "cf-connecting-ip"),
    ).resolves.toBe("203.0.113.9");
  });

  it("falls back to a sentinel rather than throwing when there is no header", async () => {
    await expect(loadClientIp("1", {})).resolves.toBe("unknown");
  });

  it("treats a malformed hop count as one hop", async () => {
    await expect(
      loadClientIp("nonsense", { "x-forwarded-for": "1.1.1.1, 203.0.113.9" }),
    ).resolves.toBe("203.0.113.9");
  });
});
