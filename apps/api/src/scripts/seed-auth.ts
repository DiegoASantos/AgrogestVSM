import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AuthSeedModule } from "../modules/auth/infrastructure/seeds/auth-seed.module";
import { AuthSeedService } from "../modules/auth/infrastructure/seeds/auth-seed.service";

async function bootstrap() {
  const applicationContext = await NestFactory.createApplicationContext(
    AuthSeedModule,
    {
      logger: ["log", "warn", "error"]
    }
  );

  try {
    const authSeedService = applicationContext.get(AuthSeedService);

    await authSeedService.run();
    Logger.log("Auth seed finished successfully.", "AuthSeedScript");
  } finally {
    await applicationContext.close();
  }
}

void bootstrap();
