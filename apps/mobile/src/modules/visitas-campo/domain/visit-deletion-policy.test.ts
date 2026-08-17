import { describe, expect, it } from "vitest";

import { canUserDeleteVisit } from "./visit-deletion-policy";

describe("canUserDeleteVisit", () => {
  it("allows an authorized owner", () => {
    expect(
      canUserDeleteVisit({
        agronomistUserId: "user-1",
        canDeleteVisits: true,
        currentUserId: "user-1"
      })
    ).toBe(true);
  });

  it("rejects a user without permission", () => {
    expect(
      canUserDeleteVisit({
        agronomistUserId: "user-1",
        canDeleteVisits: false,
        currentUserId: "user-1"
      })
    ).toBe(false);
  });

  it("rejects a different agronomist", () => {
    expect(
      canUserDeleteVisit({
        agronomistUserId: "user-1",
        canDeleteVisits: true,
        currentUserId: "user-2"
      })
    ).toBe(false);
  });
});
