import { registerAs } from "@nestjs/config";

import { APPLICATION_NAME } from "../common/constants/application.constants";
import type { DatabaseRuntimeConfig } from "./environment.types";
import { readEnvironmentVariables } from "./env.validation";

export const databaseConfig = registerAs(
  "database",
  (): DatabaseRuntimeConfig => {
    const environment = readEnvironmentVariables();

    return {
      type: "postgres",
      host: environment.DB_HOST,
      port: environment.DB_PORT,
      database: environment.DB_NAME,
      username: environment.DB_USER,
      password: environment.DB_PASSWORD,
      schema: environment.DB_SCHEMA,
      ssl: environment.DB_SSL
        ? { rejectUnauthorized: environment.DB_SSL_REJECT_UNAUTHORIZED }
        : false,
      synchronize: false,
      autoLoadEntities: true,
      installExtensions: false,
      logging: environment.NODE_ENV === "development",
      applicationName: APPLICATION_NAME
    };
  }
);
