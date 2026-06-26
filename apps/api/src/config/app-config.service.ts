import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import { appConfig } from "./app.config";
import { authConfig } from "./auth.config";
import { databaseConfig } from "./database.config";
import type {
  AppRuntimeConfig,
  AuthRuntimeConfig,
  DatabaseRuntimeConfig,
  NodeEnvironment
} from "./environment.types";

@Injectable()
export class AppConfigService {
  constructor(
    @Inject(appConfig.KEY)
    private readonly runtimeAppConfig: ConfigType<typeof appConfig>,
    @Inject(authConfig.KEY)
    private readonly runtimeAuthConfig: ConfigType<typeof authConfig>,
    @Inject(databaseConfig.KEY)
    private readonly runtimeDatabaseConfig: ConfigType<typeof databaseConfig>
  ) {}

  get appName(): string {
    return this.runtimeAppConfig.name;
  }

  get nodeEnv(): NodeEnvironment {
    return this.runtimeAppConfig.env;
  }

  get host(): string {
    return this.runtimeAppConfig.host;
  }

  get port(): number {
    return this.runtimeAppConfig.port;
  }

  get trustProxy(): boolean {
    return this.runtimeAppConfig.trustProxy;
  }

  get logLevel(): string {
    return this.runtimeAppConfig.logLevel;
  }

  get loginRateLimit(): AppRuntimeConfig["loginRateLimit"] {
    return this.runtimeAppConfig.loginRateLimit;
  }

  get database(): DatabaseRuntimeConfig {
    return this.runtimeDatabaseConfig;
  }

  get auth(): AuthRuntimeConfig {
    return this.runtimeAuthConfig;
  }

  get allowedOrigins(): string[] {
    return this.runtimeAppConfig.allowedOrigins ?? [];
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === "development";
  }

  get isProduction(): boolean {
    return this.nodeEnv === "production";
  }

  toJSON() {
    return {
      appName: this.appName,
      nodeEnv: this.nodeEnv,
      host: this.host,
      port: this.port,
      trustProxy: this.trustProxy,
      logLevel: this.logLevel
    };
  }
}
