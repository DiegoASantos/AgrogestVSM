import { UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import type { AppConfigService } from "../../../../config/app-config.service";
import { CostBuildApiKeyGuard } from "./cost-build-api-key.guard";

describe("CostBuildApiKeyGuard", () => {
  it("allows requests with the configured API key", () => {
    const guard = makeGuard("test-cost-build-key");

    expect(guard.canActivate(makeContext("test-cost-build-key"))).toBe(true);
  });

  it("rejects requests without API key", () => {
    const guard = makeGuard("test-cost-build-key");

    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      UnauthorizedException
    );
  });

  it("rejects requests with an invalid API key", () => {
    const guard = makeGuard("test-cost-build-key");

    expect(() => guard.canActivate(makeContext("wrong-key"))).toThrow(
      UnauthorizedException
    );
  });

  it("rejects requests when the integration key is not configured", () => {
    const guard = makeGuard("");

    expect(() => guard.canActivate(makeContext("test-cost-build-key"))).toThrow(
      UnauthorizedException
    );
  });
});

function makeGuard(costBuildApiKey: string) {
  return new CostBuildApiKeyGuard({
    costBuildApiKey
  } as AppConfigService);
}

function makeContext(apiKey: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {
          "x-api-key": apiKey
        }
      })
    })
  } as unknown as ExecutionContext;
}
