import { registerAs } from "@nestjs/config";

import type { AuthRuntimeConfig } from "./environment.types";
import { readEnvironmentVariables } from "./env.validation";

export const authConfig = registerAs(
  "auth",
  (): AuthRuntimeConfig => {
    const environment = readEnvironmentVariables();

    return {
      accessSecret: environment.JWT_ACCESS_SECRET,
      accessExpiresIn: environment.JWT_ACCESS_EXPIRES_IN,
      refreshSecret: environment.JWT_REFRESH_SECRET,
      refreshExpiresIn: environment.JWT_REFRESH_EXPIRES_IN
    };
  }
);
