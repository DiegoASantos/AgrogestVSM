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
      envFilePath: [".env.local", ".env"],
      load: [appConfig, authConfig, databaseConfig],
      validate: validateEnvironment
    })
  ],
  providers: [AppConfigService],
  exports: [ConfigModule, AppConfigService]
})
export class AppConfigModule {}
