import { timingSafeEqual } from "node:crypto";

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";

import { AppConfigService } from "../../../../config/app-config.service";

type RequestWithHeaders = {
  headers: Record<string, string | string[] | undefined>;
};

@Injectable()
export class CostBuildApiKeyGuard implements CanActivate {
  constructor(private readonly appConfig: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedApiKey = this.appConfig.costBuildApiKey;
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const providedApiKey = this.extractApiKey(request.headers["x-api-key"]);

    if (!expectedApiKey || !providedApiKey) {
      throw new UnauthorizedException("API key requerida.");
    }

    if (!isSameSecret(providedApiKey, expectedApiKey)) {
      throw new UnauthorizedException("API key invalida.");
    }

    return true;
  }

  private extractApiKey(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
      return value[0]?.trim() || null;
    }

    return value?.trim() || null;
  }
}

function isSameSecret(providedValue: string, expectedValue: string): boolean {
  const provided = Buffer.from(providedValue);
  const expected = Buffer.from(expectedValue);

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}
