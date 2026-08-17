import "reflect-metadata";

import { CanActivate, ExecutionContext, Injectable, Module } from "@nestjs/common";
import { APP_GUARD, NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { getRepositoryToken } from "@nestjs/typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GlobalExceptionFilter } from "../common/filters/global-exception.filter";
import type { AuthenticatedRequest } from "../modules/auth/types/auth.types";
import { RolesGuard } from "../modules/auth/presentation/guards/roles.guard";
import { CoadyuvanteEntity } from "../modules/visita-recetas/infrastructure/persistence/entities/coadyuvante.entity";
import { FertilizanteEntity } from "../modules/visita-recetas/infrastructure/persistence/entities/fertilizante.entity";
import { IngredienteActivoEntity } from "../modules/visita-recetas/infrastructure/persistence/entities/ingrediente-activo.entity";
import { MarcaProductoEntity } from "../modules/visita-recetas/infrastructure/persistence/entities/marca-producto.entity";
import { ModoAccionEntity } from "../modules/visita-recetas/infrastructure/persistence/entities/modo-accion.entity";
import { TipoControlEntity } from "../modules/visita-recetas/infrastructure/persistence/entities/tipo-control.entity";
import { TipoProductoFitosanitarioEntity } from "../modules/visita-recetas/infrastructure/persistence/entities/tipo-producto-fitosanitario.entity";
import { RecetasCatalogosController } from "../modules/visita-recetas/presentation/recetas-catalogos.controller";

const FERTILIZANTE_ID = "42";
const USER_ID = "7426209a-2bdd-448b-98ca-57886e578d5b";
const emptyRepository = {};
const fertilizerRepository = {
  findOneOrFail: vi.fn(),
  save: vi.fn()
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
      email: "catalog-test@example.test",
      roles: [role]
    };
    return true;
  }
}

@Module({
  controllers: [RecetasCatalogosController],
  providers: [
    {
      provide: getRepositoryToken(CoadyuvanteEntity),
      useValue: emptyRepository
    },
    {
      provide: getRepositoryToken(IngredienteActivoEntity),
      useValue: emptyRepository
    },
    {
      provide: getRepositoryToken(MarcaProductoEntity),
      useValue: emptyRepository
    },
    {
      provide: getRepositoryToken(ModoAccionEntity),
      useValue: emptyRepository
    },
    {
      provide: getRepositoryToken(TipoControlEntity),
      useValue: emptyRepository
    },
    {
      provide: getRepositoryToken(TipoProductoFitosanitarioEntity),
      useValue: emptyRepository
    },
    {
      provide: getRepositoryToken(FertilizanteEntity),
      useValue: fertilizerRepository
    },
    { provide: APP_GUARD, useClass: TestAuthenticationGuard },
    { provide: APP_GUARD, useClass: RolesGuard }
  ]
})
class RecipeCatalogContractModule {}

describe("recipe catalog deactivation HTTP contract", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      RecipeCatalogContractModule,
      new FastifyAdapter(),
      { abortOnError: false, logger: false }
    );
    app.useGlobalFilters(new GlobalExceptionFilter(false, testLogger as never));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    fertilizerRepository.findOneOrFail.mockResolvedValue({
      id: FERTILIZANTE_ID,
      publicId: "4ed1f98f-d2f3-4a3c-a936-6527263709a7",
      name: "Fertilizante de prueba",
      type: "solido",
      concentracion: "20",
      unidadMedida: "%",
      isActive: true
    });
    fertilizerRepository.save.mockImplementation(async (entity) => entity);
  });

  afterAll(async () => {
    await app?.close();
  });

  it("allows ADMIN to soft-deactivate without removing the row", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/fertilizantes/${FERTILIZANTE_ID}`,
      headers: { "x-test-role": "ADMIN" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: { id: FERTILIZANTE_ID, isActive: false }
    });
    expect(fertilizerRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: FERTILIZANTE_ID, isActive: false })
    );
  });

  it("rejects AGRONOMO before accessing the repository", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: `/fertilizantes/${FERTILIZANTE_ID}`,
      headers: { "x-test-role": "AGRONOMO" }
    });

    expect(response.statusCode).toBe(403);
    expect(fertilizerRepository.findOneOrFail).not.toHaveBeenCalled();
    expect(fertilizerRepository.save).not.toHaveBeenCalled();
  });
});
