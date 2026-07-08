import { registerAs } from "@nestjs/config";

import { APPLICATION_NAME } from "../common/constants/application.constants";
import type { AppRuntimeConfig } from "./environment.types";
import { readEnvironmentVariables } from "./env.validation";

export const appConfig = registerAs("app", (): AppRuntimeConfig => {
  const environment = readEnvironmentVariables();

  return {
    name: APPLICATION_NAME,
    env: environment.NODE_ENV,
    host: environment.APP_HOST,
    port: environment.APP_PORT,
    trustProxy: environment.APP_TRUST_PROXY,
    logLevel: environment.LOG_LEVEL,
    allowedOrigins: environment.CORS_ALLOWED_ORIGINS,
    costBuildApiKey: environment.COST_BUILD_API_KEY,
    loginRateLimit: {
      ttlMs: environment.LOGIN_RATE_LIMIT_TTL_MS,
      max: environment.LOGIN_RATE_LIMIT_MAX,
      blockDurationMs: environment.LOGIN_RATE_LIMIT_BLOCK_MS
    }
  };
});
