import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export const SWAGGER_PATH = "docs";

export function setupSwagger(app: NestFastifyApplication): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("AgroGest VSM API")
      .setDescription("Base tecnica de la API con NestJS y Fastify.")
      .setVersion("0.1.0")
      .addBearerAuth(
        {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        },
        "access-token"
      )
      .build()
  );

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: `${SWAGGER_PATH}/json`
  });
}
