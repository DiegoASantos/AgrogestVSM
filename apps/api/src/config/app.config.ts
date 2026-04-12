import { registerAs } from "@nestjs/config";

import { APPLICATION_NAME } from "../common/constants/application.constants";
import type { AppRuntimeConfig } from "./environment.types";
import { readEnvironmentVariables } from "./env.validation";

export const appConfig = registerAs(
  "app",
  (): AppRuntimeConfig => {
    const environment = readEnvironmentVariables();

    return {
      name: APPLICATION_NAME,
      env: environment.NODE_ENV,
      host: environment.APP_HOST,
      port: environment.APP_PORT,
      allowedOrigins: environment.CORS_ALLOWED_ORIGINS
    };
  }
);
