import "reflect-metadata";

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Module,
  NotFoundException
} from "@nestjs/common";
import { APP_GUARD, NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GlobalExceptionFilter } from "../common/filters/global-exception.filter";
import { createSuccessResponse } from "../common/http/api-response";
import { createGlobalValidationPipe } from "../common/pipes/global-validation.pipe";
import type { AuthenticatedRequest } from "../modules/auth/types/auth.types";
import { RolesGuard } from "../modules/auth/presentation/guards/roles.guard";
import { ClimaService } from "../modules/clima/application/clima.service";
import { WeatherLinkQueryService } from "../modules/clima/application/weatherlink-query.service";
import { ClimaController } from "../modules/clima/presentation/clima.controller";

const RESERVOIR_ID = "4ed1f98f-d2f3-4a3c-a936-6527263709a7";
const READING_ID = "5dd41868-0173-4dc5-95e7-e21ca0ea4f36";
const USER_ID = "7426209a-2bdd-448b-98ca-57886e578d5b";

const climaService = {
  getReservorios: vi.fn(),
  getReservorioHistory: vi.fn(),
  createReservorioReading: vi.fn(),
  updateReservorioReading: vi.fn(),
  deleteReservorioReading: vi.fn()
};
const weatherLinkQuery = {
  status: vi.fn(() => ({ enabled: true, running: false, mode: "DIRECT_QUERY" })),
  refreshStations: vi.fn(async () => ({ updated: 0 })),
  setStationActive: vi.fn(async (publicId: string, isActive: boolean) => ({
    publicId,
    isActive
  }))
};

const testLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

@Injectable()
class TestAuthenticationGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = String(request.headers["x-test-role"] ?? "AGRONOMO");
    request.user = {
      sub: USER_ID,
      userId: "1",
      email: "test@example.test",
      roles: [role]
    };
    return true;
  }
}

@Module({
  controllers: [ClimaController],
  providers: [
    { provide: ClimaService, useValue: climaService },
    { provide: WeatherLinkQueryService, useValue: weatherLinkQuery },
    { provide: APP_GUARD, useClass: TestAuthenticationGuard },
    { provide: APP_GUARD, useClass: RolesGuard }
  ]
})
class ReservoirContractModule {}

describe("reservoir HTTP contract", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      ReservoirContractModule,
      new FastifyAdapter(),
      { abortOnError: false, logger: false }
    );
    app.useGlobalPipes(createGlobalValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter(false, testLogger as never));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    climaService.createReservorioReading.mockResolvedValue(
      createSuccessResponse({ publicId: READING_ID })
    );
    climaService.updateReservorioReading.mockResolvedValue(
      createSuccessResponse({ publicId: READING_ID })
    );
    climaService.deleteReservorioReading.mockResolvedValue(createSuccessResponse(null));
  });

  it.each(["ADMIN", "ANALISTA", "AGRONOMO"])(
    "allows %s to read WeatherLink sync status",
    async (role) => {
      const response = await app.inject({
        method: "GET",
        url: "/clima/fuentes/weatherlink/estado",
        headers: { "x-test-role": role }
      });
      expect(response.statusCode).toBe(200);
    }
  );

  it("allows only ADMIN to activate a WeatherLink station", async () => {
    const adminUpdate = await app.inject({
      method: "PUT",
      url: `/clima/estaciones/${RESERVOIR_ID}/activo`,
      headers: { "x-test-role": "ADMIN" },
      payload: { isActive: false }
    });
    expect(adminUpdate.statusCode).toBe(200);
    expect(weatherLinkQuery.setStationActive).toHaveBeenCalledWith(RESERVOIR_ID, false);

    for (const role of ["ANALISTA", "AGRONOMO"]) {
      const denied = await app.inject({
        method: "POST",
        url: "/clima/fuentes/weatherlink/sincronizar",
        headers: { "x-test-role": role }
      });
      expect(denied.statusCode).toBe(403);
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each(["ADMIN", "ANALISTA"])(
    "allows %s to create a valid manual reading",
    async (role) => {
      const response = await injectCreate(role, validPayload());

      expect(response.statusCode).toBe(201);
      expect(climaService.createReservorioReading).toHaveBeenCalledWith(
        RESERVOIR_ID,
        expect.objectContaining({ valor: 512.4, dato_at: expect.stringContaining("Z") }),
        USER_ID
      );
    }
  );

  it("allows ANALISTA to update and delete only on explicitly marked endpoints", async () => {
    const update = await app.inject({
      method: "PUT",
      url: `/clima/reservorios/${RESERVOIR_ID}/lecturas/${READING_ID}`,
      headers: { "x-test-role": "ANALISTA" },
      payload: { valor: 500 }
    });
    const remove = await app.inject({
      method: "DELETE",
      url: `/clima/reservorios/${RESERVOIR_ID}/lecturas/${READING_ID}`,
      headers: { "x-test-role": "ANALISTA" }
    });

    expect(update.statusCode).toBe(200);
    expect(remove.statusCode).toBe(200);
  });

  it.each(["POST", "PUT", "DELETE"] as const)(
    "returns 403 when AGRONOMO attempts %s",
    async (method) => {
      const url =
        method === "POST"
          ? `/clima/reservorios/${RESERVOIR_ID}/lecturas`
          : `/clima/reservorios/${RESERVOIR_ID}/lecturas/${READING_ID}`;
      const response = await app.inject({
        method,
        url,
        headers: { "x-test-role": "AGRONOMO" },
        ...(method === "DELETE" ? {} : { payload: validPayload() })
      });

      expect(response.statusCode).toBe(403);
    }
  );

  it.each([null, true, ""])(
    "returns 400 instead of coercing unsafe value %s",
    async (valor) => {
      const response = await injectCreate("ADMIN", validPayload({ valor }));

      expect(response.statusCode).toBe(400);
      expect(climaService.createReservorioReading).not.toHaveBeenCalled();
    }
  );

  it.each(["2026-08-11", "2026-08-11T08:00:00"])(
    "returns 400 for a timestamp without timezone: %s",
    async (datoAt) => {
      const response = await injectCreate("ADMIN", validPayload({ dato_at: datoAt }));

      expect(response.statusCode).toBe(400);
      expect(climaService.createReservorioReading).not.toHaveBeenCalled();
    }
  );

  it("serializes a 404 when the reading does not belong to the reservoir", async () => {
    climaService.updateReservorioReading.mockRejectedValue(
      new NotFoundException("Lectura no encontrada.")
    );

    const response = await app.inject({
      method: "PUT",
      url: `/clima/reservorios/${RESERVOIR_ID}/lecturas/${READING_ID}`,
      headers: { "x-test-role": "ADMIN" },
      payload: { valor: 500 }
    });

    expect(response.statusCode).toBe(404);
  });

  function injectCreate(role: string, payload: Record<string, unknown>) {
    return app.inject({
      method: "POST",
      url: `/clima/reservorios/${RESERVOIR_ID}/lecturas`,
      headers: { "x-test-role": role },
      payload
    });
  }
});

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    variable: "volumen_mmc",
    valor: 512.4,
    unidad: "MMC",
    tipo: "OBSERVADO",
    dato_at: "2026-08-11T13:00:00.000Z",
    ...overrides
  };
}
