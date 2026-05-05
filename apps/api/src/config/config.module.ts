import { resolve } from "node:path";

import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppConfigService } from "./app-config.service";
import { appConfig } from "./app.config";
import { authConfig } from "./auth.config";
import { databaseConfig } from "./database.config";
import { validateEnvironment } from "./env.validation";

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: resolveEnvFilePaths(),
      load: [appConfig, authConfig, databaseConfig],
      validate: validateEnvironment
    })
  ],
  providers: [AppConfigService],
  exports: [ConfigModule, AppConfigService]
})
export class AppConfigModule {}

function resolveEnvFilePaths() {
  const cwd = process.cwd();
  const apiRoot = resolve(__dirname, "../..");

  return [
    resolve(cwd, ".env.local"),
    resolve(cwd, ".env"),
    resolve(cwd, "apps/api/.env.local"),
    resolve(cwd, "apps/api/.env"),
    resolve(apiRoot, ".env.local"),
    resolve(apiRoot, ".env")
  ];
}
