import { beforeEach, describe, expect, it } from "vitest";

import {
  isNetworkRequestAllowed,
  resetConnectivityPolicyForTests,
  setConnectivityPolicySnapshot
} from "./connectivity-policy";

describe("connectivity request policy", () => {
  beforeEach(() => resetConnectivityPolicyForTests());

  it("blocks standard traffic but allows login while manual offline has physical Internet", () => {
    setConnectivityPolicySnapshot({
      effectiveMode: "offline_manual",
      isPhysicallyOnline: true,
      preference: "offline"
    });

    expect(isNetworkRequestAllowed("standard")).toBe(false);
    expect(isNetworkRequestAllowed("essential")).toBe(true);
    expect(isNetworkRequestAllowed("probe")).toBe(false);
  });

  it("allows probes only while automatic mode has physical Internet", () => {
    setConnectivityPolicySnapshot({
      effectiveMode: "offline_auto",
      isPhysicallyOnline: true,
      preference: "automatic"
    });

    expect(isNetworkRequestAllowed("standard")).toBe(false);
    expect(isNetworkRequestAllowed("probe")).toBe(true);
  });

  it("blocks every request when NetInfo reports no physical Internet", () => {
    setConnectivityPolicySnapshot({
      effectiveMode: "offline_auto",
      isPhysicallyOnline: false,
      preference: "automatic"
    });

    expect(isNetworkRequestAllowed("standard")).toBe(false);
    expect(isNetworkRequestAllowed("essential")).toBe(false);
    expect(isNetworkRequestAllowed("probe")).toBe(false);
  });
});
