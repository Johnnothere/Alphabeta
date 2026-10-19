import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The rate limiter is only as good as its idea of "who". X-Forwarded-For is a
 * list the caller can prepend to, so the left-most entry is attacker-supplied;
 * these tests pin the behaviour that we count back from the right instead.
 */
function loadClientIp(hops: string, headers: Record<string, string>) {
  vi.resetModules();
  process.env["TRUSTED_PROXY_HOPS"] = hops;
  vi.doMock("@tanstack/react-start/server", () => ({
    getRequest: () => ({ headers: new Headers(headers) }),
  }));
  return import("@/lib/client-ip").then((m) => m.clientIp());
}

afterEach(() => {
  delete process.env["TRUSTED_PROXY_HOPS"];
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

  it("does not run off the start of a chain shorter than the hop count", async () => {
    await expect(loadClientIp("5", { "x-forwarded-for": "203.0.113.9" })).resolves.toBe(
      "203.0.113.9",
    );
  });

  it("prefers a single-value header the edge overwrites", async () => {
    await expect(
      loadClientIp("1", { "x-real-ip": "203.0.113.5", "x-forwarded-for": "1.1.1.1, 9.9.9.9" }),
    ).resolves.toBe("203.0.113.5");
  });

  it("falls back to a sentinel rather than throwing when there is no header", async () => {
    await expect(loadClientIp("1", {})).resolves.toBe("unknown");
  });

  it("treats a malformed hop count as one hop", async () => {
    await expect(loadClientIp("nonsense", { "x-forwarded-for": "1.1.1.1, 203.0.113.9" })).resolves.toBe(
      "203.0.113.9",
    );
  });
});
