import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import multipart from "@fastify/multipart";

import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { RequestLoggingInterceptor } from "./common/interceptors/request-logging.interceptor";
import { createApiLogger } from "./common/logging/api-logger";
import { createGlobalValidationPipe } from "./common/pipes/global-validation.pipe";
import { AppConfigService } from "./config/app-config.service";
import { readEnvironmentVariables } from "./config/env.validation";
import { setupSwagger } from "./config/swagger.config";

async function bootstrap() {
  const environment = readEnvironmentVariables();
  const logger = createApiLogger({
    appName: "AgroGest VSM API",
    environment: environment.NODE_ENV,
    level: environment.LOG_LEVEL
  });
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: environment.APP_TRUST_PROXY
    }),
    {
      logger: false
    }
  );

  app.enableShutdownHooks();
  await app.register(multipart as unknown as Parameters<typeof app.register>[0], {
    limits: { files: 1, fields: 0, parts: 1, fileSize: 10 * 1024 * 1024 }
  });

  const appConfig = app.get(AppConfigService);

  app.enableCors({
    origin: appConfig.isDevelopment ? true : (appConfig.allowedOrigins ?? []),
    credentials: true
  });

  app.useGlobalPipes(createGlobalValidationPipe());
  app.useGlobalFilters(new GlobalExceptionFilter(appConfig.isDevelopment, logger));
  app.useGlobalInterceptors(new RequestLoggingInterceptor(logger));

  if (appConfig.isDevelopment) {
    setupSwagger(app);
  }

  await app.listen({
    host: appConfig.host,
    port: appConfig.port
  });

  logger.info(
    {
      event: "api.started",
      url: await app.getUrl(),
      environment: appConfig.nodeEnv,
      trustProxy: appConfig.trustProxy
    },
    "API started"
  );
}

void bootstrap();
