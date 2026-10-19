import { describe, expect, it } from "vitest";
import { countHelped, isEligible, streak, vouchError } from "@/lib/eligibility";

const none = { recent: [false, false, false], vouches: 0, helped: 0 };

describe("meetup eligibility", () => {
  it("qualifies after attending the last 3 hackathons in a row", () => {
    expect(isEligible({ ...none, recent: [true, true, true] })).toBe(true);
  });
  it("does not qualify when the 3 attended are not consecutive", () => {
    expect(streak([true, false, true])).toBe(1);
    expect(isEligible({ ...none, recent: [true, false, true] })).toBe(false);
  });
  it("does not qualify when the most recent hackathon was missed", () => {
    expect(isEligible({ ...none, recent: [false, true, true] })).toBe(false);
  });
  it("qualifies with 3 vouches but not 2", () => {
    expect(isEligible({ ...none, vouches: 3 })).toBe(true);
    expect(isEligible({ ...none, vouches: 2 })).toBe(false);
  });
  it("qualifies after helping 10 members but not 9", () => {
    expect(isEligible({ ...none, helped: 10 })).toBe(true);
    expect(isEligible({ ...none, helped: 9 })).toBe(false);
  });
});

describe("help counting", () => {
  it("counts helping the same member twice once", () => {
    expect(
      countHelped([
        { helped_id: "a", confirmed: true },
        { helped_id: "a", confirmed: true },
        { helped_id: "b", confirmed: true },
      ]),
    ).toBe(2);
  });
  it("ignores unconfirmed help", () => {
    expect(countHelped([{ helped_id: "a", confirmed: false }])).toBe(0);
  });
});

describe("vouching", () => {
  it("rejects vouches from founders", () => {
    expect(vouchError("f", "m", true)).not.toBeNull();
  });
  it("rejects self-vouching", () => {
    expect(vouchError("m", "m", false)).not.toBeNull();
  });
  it("allows a member to vouch for another member", () => {
    expect(vouchError("m1", "m2", false)).toBeNull();
  });
});
