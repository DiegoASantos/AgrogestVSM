import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";

import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";
import { createGlobalValidationPipe } from "./common/pipes/global-validation.pipe";
import { AppConfigService } from "./config/app-config.service";
import { readEnvironmentVariables } from "./config/env.validation";
import { setupSwagger } from "./config/swagger.config";

async function bootstrap() {
  const environment = readEnvironmentVariables();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: environment.APP_TRUST_PROXY
    })
  );

  app.enableShutdownHooks();

  const appConfig = app.get(AppConfigService);

  app.enableCors({
    origin: appConfig.isDevelopment ? true : (appConfig.allowedOrigins ?? []),
    credentials: true
  });

  app.useGlobalPipes(createGlobalValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter(appConfig.isDevelopment));
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  if (appConfig.isDevelopment) {
    setupSwagger(app);
  }

  await app.listen({
    host: appConfig.host,
    port: appConfig.port
  });

  Logger.log(`API listening on ${await app.getUrl()}`, appConfig.appName);
}

void bootstrap();
