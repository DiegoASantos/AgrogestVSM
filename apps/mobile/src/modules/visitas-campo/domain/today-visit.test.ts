import { describe, expect, it } from "vitest";

import { findPreferredTodayVisit } from "./today-visit";

describe("findPreferredTodayVisit", () => {
  const now = new Date("2026-10-13T02:30:00.000Z");
  const closed = {
    id: "closed", visitDate: "2026-10-12", agronomistUserId: "7", endVisitTime: "11:00"
  };
  const open = {
    id: "open", visitDate: "2026-10-12", agronomistUserId: "7", endVisitTime: null
  };

  it("uses Peru's calendar day and prefers an open visit", () => {
    expect(findPreferredTodayVisit([closed, open], "7", now)?.id).toBe("open");
  });

  it("ignores another agronomist and a different day", () => {
    expect(findPreferredTodayVisit([
      { ...open, agronomistUserId: "8" },
      { ...open, visitDate: "2026-10-13" }
    ], "7", now)).toBeUndefined();
  });
});
