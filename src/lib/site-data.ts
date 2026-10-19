import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Stat = { value: number | null; label: string };
export type Ship = { kind: string; summary: string };

export type SiteData = {
  stats: Stat[];
  ships: Ship[];
  /** ISO date -> contribution count, for days that had any. */
  contributions: Record<string, number>;
  contributionTotal: number;
};

type RawSiteData = {
  stats: {
    members: number | null;
    ships_this_year: number | null;
    people_helped: number | null;
    pitch_decks: number;
  } | null;
  ships: Ship[];
  contributions: Record<string, number>;
};

export const EMPTY_SITE_DATA: SiteData = {
  stats: [],
  ships: [],
  contributions: {},
  contributionTotal: 0,
};

/**
 * One round trip for everything the landing page shows.
 *
 * A null stat means the community does not publish that number, and the tile
 * is dropped rather than rendered as a zero — a zero in that grid reads as a
 * measurement, which is exactly the problem with inventing the figure.
 */
export const siteDataQuery = queryOptions({
  queryKey: ["site-data"],
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<SiteData> => {
    const { data, error } = await supabase.rpc("public_site_data");
    if (error) throw error;
    const raw = (data ?? {}) as Partial<RawSiteData>;

    const s = raw.stats ?? null;
    const stats: Stat[] = [
      { value: s?.members ?? null, label: "members" },
      { value: s?.ships_this_year ?? null, label: "ships this year" },
      { value: s?.people_helped ?? null, label: "people unblocked" },
      { value: s?.pitch_decks ?? 0, label: "pitch decks" },
    ].filter((stat) => stat.value !== null);

    const contributions = raw.contributions ?? {};
    return {
      stats,
      ships: raw.ships ?? [],
      contributions,
      contributionTotal: Object.values(contributions).reduce<number>(
        (a, b) => a + Number(b || 0),
        0,
      ),
    };
  },
});
