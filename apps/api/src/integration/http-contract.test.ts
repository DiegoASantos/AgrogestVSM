import "reflect-metadata";

import { ConflictException, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { ThrottlerModule } from "@nestjs/throttler";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GlobalExceptionFilter } from "../common/filters/global-exception.filter";
import { createSuccessResponse } from "../common/http/api-response";
import { RequestLoggingInterceptor } from "../common/interceptors/request-logging.interceptor";
import { createGlobalValidationPipe } from "../common/pipes/global-validation.pipe";
import { AuthService } from "../modules/auth/application/auth.service";
import { AuthController } from "../modules/auth/presentation/auth.controller";
import { LoginThrottlerGuard } from "../modules/auth/presentation/guards/login-throttler.guard";
import { ParcelasService } from "../modules/parcelas/application/parcelas.service";
import { ParcelasController } from "../modules/parcelas/presentation/parcelas.controller";
import { VisitaRecetasConsolidacionService } from "../modules/visita-recetas/application/visita-recetas-consolidacion.service";
import { VisitaRecetasService } from "../modules/visita-recetas/application/visita-recetas.service";
import { VisitaCampoRecetasController } from "../modules/visita-recetas/presentation/visita-campo-recetas.controller";
import { VisitasCampoService } from "../modules/visitas-campo/application/visitas-campo.service";
import { VisitasCampoController } from "../modules/visitas-campo/presentation/visitas-campo.controller";

const authService = {
  login: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  getModuleStatus: vi.fn(),
  getAuthenticatedUser: vi.fn()
};

const parcelasService = {
  create: vi.fn(),
  findAll: vi.fn(),
  findMap: vi.fn(),
  getSummary: vi.fn(),
  getHistorialVisitas: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn()
};

const visitasCampoService = {
  create: vi.fn(),
  findAll: vi.fn(),
  findMap: vi.fn(),
  findById: vi.fn(),
  getFullDetail: vi.fn(),
  update: vi.fn(),
  remove: vi.fn()
};

const recetasService = {
  save: vi.fn(),
  findByVisitaId: vi.fn(),
  getHistorial: vi.fn()
};

const consolidacionService = {
  getConsolidacion: vi.fn()
};

const testLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100
      }
    ])
  ],
  controllers: [
    AuthController,
    ParcelasController,
    VisitasCampoController,
    VisitaCampoRecetasController
  ],
  providers: [
    {
      provide: AuthService,
      useValue: authService
    },
    {
      provide: LoginThrottlerGuard,
      useValue: {
        canActivate: () => true
      }
    },
    {
      provide: ParcelasService,
      useValue: parcelasService
    },
    {
      provide: VisitasCampoService,
      useValue: visitasCampoService
    },
    {
      provide: VisitaRecetasService,
      useValue: recetasService
    },
    {
      provide: VisitaRecetasConsolidacionService,
      useValue: consolidacionService
    }
  ]
})
class IntegrationContractModule {}

describe("API critical HTTP integration contract", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      IntegrationContractModule,
      new FastifyAdapter(),
      { abortOnError: false, logger: false }
    );
    app.useGlobalPipes(createGlobalValidationPipe());
    app.useGlobalFilters(new GlobalExceptionFilter(false, testLogger as never));
    app.useGlobalInterceptors(new RequestLoggingInterceptor(testLogger as never));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("normalizes auth login input and returns the standard success envelope", async () => {
    authService.login.mockResolvedValue(
      createSuccessResponse({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        tokenType: "Bearer",
        expiresIn: "15m",
        refreshExpiresIn: "30d",
        user: {
          publicId: "user-1",
          firstName: "Admin",
          lastName: "VSM",
          email: "admin@example.com",
          phone: null,
          isActive: true,
          roles: [{ id: 1, code: "ADMIN", name: "Administrador" }]
        }
      })
    );

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: " ADMIN@EXAMPLE.COM ",
        password: "secret123"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        tokenType: "Bearer",
        user: {
          email: "admin@example.com"
        }
      }
    });
    expect(response.headers["x-request-id"]).toEqual(expect.any(String));
    expect(testLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "http.request.completed",
        method: "POST",
        path: "/auth/login",
        statusCode: 200,
        requestId: expect.any(String)
      }),
      "HTTP request completed"
    );
    expect(authService.login).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "secret123"
    });
  });

  it("rejects invalid auth input before reaching the service", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "not-an-email"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        statusCode: 400,
        code: "BAD_REQUEST",
        message: "Validation failed.",
        path: "/auth/login",
        method: "POST"
      }
    });
    expect(authService.login).not.toHaveBeenCalled();
  });

  it("preserves parcela geodata payloads and serializes domain conflicts", async () => {
    parcelasService.create.mockRejectedValue(
      new ConflictException("geometry overlaps with parcela PAR-002.")
    );

    const response = await app.inject({
      method: "POST",
      url: "/parcelas",
      payload: {
        productorId: "1",
        sectorId: "2",
        code: "PAR-001",
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [-80.1, -5.1],
                [-80, -5.1],
                [-80, -5],
                [-80.1, -5],
                [-80.1, -5.1]
              ]
            ]
          ]
        },
        referencePoint: {
          type: "Point",
          coordinates: [-80.05, -5.05]
        }
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        statusCode: 409,
        code: "CONFLICT",
        message: "geometry overlaps with parcela PAR-002.",
        path: "/parcelas",
        method: "POST"
      }
    });
    expect(parcelasService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        geometry: expect.objectContaining({ type: "MultiPolygon" }),
        referencePoint: expect.objectContaining({ type: "Point" })
      })
    );
  });

  it("validates visita sync idempotency input at the HTTP boundary", async () => {
    visitasCampoService.create.mockResolvedValue(
      createSuccessResponse({
        id: "99",
        publicId: "9f6c2d56-4b6e-4a96-a48b-f55eb0f25281",
        visitDate: "2026-04-04"
      })
    );

    const response = await app.inject({
      method: "POST",
      url: "/visitas-campo",
      payload: {
        publicId: "9f6c2d56-4b6e-4a96-a48b-f55eb0f25281",
        cropId: "1",
        varietyId: "1",
        parcelaId: "1",
        campaignId: "1",
        agronomistUserId: "1",
        visitDate: "2026-04-04",
        startVisitTime: "08:30"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        publicId: "9f6c2d56-4b6e-4a96-a48b-f55eb0f25281"
      }
    });
    expect(visitasCampoService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        publicId: "9f6c2d56-4b6e-4a96-a48b-f55eb0f25281",
        visitDate: "2026-04-04",
        startVisitTime: "08:30"
      })
    );
  });

  it("rejects invalid visita ids through ParseEntityIdPipe", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/visitas-campo/abc"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        statusCode: 400,
        code: "BAD_REQUEST",
        path: "/visitas-campo/abc",
        method: "GET"
      }
    });
    expect(visitasCampoService.findById).not.toHaveBeenCalled();
  });

  it("validates receta business enum rules before persistence", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/visitas-campo/7/receta",
      payload: {
        fitosanidad: [
          {
            numero: 1,
            objetivo: "hongo",
            objetivoNombre: "Objetivo invalido"
          }
        ],
        fertilizacion: [],
        labores: []
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      error: {
        statusCode: 400,
        code: "BAD_REQUEST",
        message: "Validation failed.",
        path: "/visitas-campo/7/receta",
        method: "POST"
      }
    });
    expect(recetasService.save).not.toHaveBeenCalled();
  });

  it("routes valid receta saves with parsed visit id and nested payload", async () => {
    recetasService.save.mockResolvedValue(
      createSuccessResponse({
        id: "15",
        visitaId: "7",
        version: 1
      })
    );

    const response = await app.inject({
      method: "POST",
      url: "/visitas-campo/7/receta",
      payload: {
        etapaFenologica: "Floracion",
        fitosanidad: [
          {
            numero: 1,
            objetivo: "plaga",
            objetivoNombre: "Trips"
          }
        ],
        fertilizacion: [
          {
            viaAplicacion: "foliar",
            fertilizanteNombre: "Nitrato de potasio"
          }
        ],
        riego: {
          tipoRecomendacion: "riego_ligero"
        },
        labores: [
          {
            labor: "horqueteo"
          }
        ]
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        visitaId: "7",
        version: 1
      }
    });
    expect(recetasService.save).toHaveBeenCalledWith(
      "7",
      expect.objectContaining({
        fitosanidad: [expect.objectContaining({ objetivo: "plaga" })],
        riego: expect.objectContaining({ tipoRecomendacion: "riego_ligero" })
      })
    );
  });
});
