import { describe, expect, it } from "vitest";

import { buildUpstreamHeaders } from "../../../pages/api/[...path]";

describe("buildUpstreamHeaders", () => {
  it("replaces caller-controlled forwarding headers with the socket address", () => {
    const headers = buildUpstreamHeaders(
      {
        host: "panel.example.test",
        authorization: "Bearer test-token",
        cookie: "web-session=private",
        "content-type": "application/json",
        forwarded: "for=203.0.113.17",
        "x-forwarded-for": "203.0.113.17",
        "x-forwarded-host": "other.example.test",
        "x-forwarded-port": "443",
        "x-forwarded-proto": "https",
        "x-real-ip": "203.0.113.18"
      },
      "192.0.2.24"
    );

    expect(headers).toMatchObject({
      authorization: "Bearer test-token",
      "content-type": "application/json",
      "x-forwarded-for": "192.0.2.24"
    });
    expect(headers).not.toHaveProperty("host");
    expect(headers).not.toHaveProperty("cookie");
    expect(headers).not.toHaveProperty("forwarded");
    expect(headers).not.toHaveProperty("x-forwarded-host");
    expect(headers).not.toHaveProperty("x-forwarded-port");
    expect(headers).not.toHaveProperty("x-forwarded-proto");
    expect(headers).not.toHaveProperty("x-real-ip");
  });
});
