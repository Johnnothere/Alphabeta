import { describe, expect, it, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

const { siteDataQuery } = await import("@/lib/site-data");
const run = () => (siteDataQuery.queryFn as () => Promise<ReturnType<never>>)();

beforeEach(() => rpc.mockReset());

/**
 * The landing page presents these numbers as measurements ("live", "sampled"),
 * so the contract that matters is: an absent number produces no tile, never a
 * zero that reads as a real count.
 */
describe("site data", () => {
  it("drops tiles for numbers the community has not published", async () => {
    rpc.mockResolvedValue({
      data: { stats: { members: null, ships_this_year: null, people_helped: null, pitch_decks: 0 }, ships: [], contributions: {} },
      error: null,
    });
    const d = await run();
    expect(d.stats.map((s) => s.label)).toEqual(["pitch decks"]);
    expect(d.stats.every((s) => s.value !== null)).toBe(true);
  });

  it("keeps published numbers in display order", async () => {
    rpc.mockResolvedValue({
      data: { stats: { members: 48, ships_this_year: 23, people_helped: 61, pitch_decks: 0 }, ships: [], contributions: {} },
      error: null,
    });
    const d = await run();
    expect(d.stats).toEqual([
      { value: 48, label: "members" },
      { value: 23, label: "ships this year" },
      { value: 61, label: "people unblocked" },
      { value: 0, label: "pitch decks" },
    ]);
  });

  it("returns an empty feed rather than inventing one when there are no ships", async () => {
    rpc.mockResolvedValue({ data: { stats: null, ships: [], contributions: {} }, error: null });
    const d = await run();
    expect(d.ships).toEqual([]);
    expect(d.stats).toEqual([{ value: 0, label: "pitch decks" }]);
  });

  it("totals contributions across the returned days", async () => {
    rpc.mockResolvedValue({
      data: { stats: null, ships: [], contributions: { "2026-10-01": 3, "2026-10-02": 4 } },
      error: null,
    });
    expect((await run()).contributionTotal).toBe(7);
  });

  it("reports zero contributions when no day has activity", async () => {
    rpc.mockResolvedValue({ data: { stats: null, ships: [], contributions: {} }, error: null });
    expect((await run()).contributionTotal).toBe(0);
  });

  it("surfaces an RPC error instead of rendering a silently empty page", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(run()).rejects.toThrow("boom");
  });

  it("tolerates a null payload", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const d = await run();
    expect(d.ships).toEqual([]);
    expect(d.contributionTotal).toBe(0);
  });
});
