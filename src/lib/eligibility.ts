/** Members-only meetup rules. Mirrored by public.is_meetup_eligible in the database. */
export const RULES = { streak: 3, vouches: 3, helped: 10 } as const;

export type Progress = {
  /** Attendance for the most recent past hackathons, newest first. */
  recent: boolean[];
  /** Vouches received from non-founder members. */
  vouches: number;
  /** Distinct members helped (confirmed). */
  helped: number;
};

/** Consecutive hackathons attended, counting back from the most recent one. */
export function streak(recent: boolean[]): number {
  let s = 0;
  for (const attended of recent) {
    if (!attended) break;
    s++;
  }
  return s;
}

export function isEligible(p: Progress): boolean {
  return streak(p.recent) >= RULES.streak || p.vouches >= RULES.vouches || p.helped >= RULES.helped;
}

/** Help counts unique, confirmed members only. */
export function countHelped(records: { helped_id: string; confirmed: boolean }[]): number {
  return new Set(records.filter((r) => r.confirmed).map((r) => r.helped_id)).size;
}

/** Returns a reason the vouch is not allowed, or null when it is. */
export function vouchError(
  voucherId: string,
  voucheeId: string,
  voucherIsFounder: boolean,
): string | null {
  if (voucherIsFounder) return "founders cannot vouch — vouches must come from the community";
  if (voucherId === voucheeId) return "you cannot vouch for yourself";
  return null;
}

export function parseProgress(raw: unknown): Progress {
  const r = (raw ?? {}) as Partial<Progress>;
  return {
    recent: Array.isArray(r.recent) ? r.recent.map(Boolean) : [],
    vouches: Number(r.vouches ?? 0),
    helped: Number(r.helped ?? 0),
  };
}
