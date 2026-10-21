import "reflect-metadata";
import { Module } from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { createGlobalValidationPipe } from "../common/pipes/global-validation.pipe";
import { RolesGuard } from "../modules/auth/presentation/guards/roles.guard";
import type { AuthenticatedRequest } from "../modules/auth/types/auth.types";
import { EstimacionesService } from "../modules/estimaciones/application/estimaciones.service";
import { EstimacionesController } from "../modules/estimaciones/presentation/estimaciones.controller";

const read = vi.fn().mockResolvedValue([]);
const write = vi.fn().mockImplementation(async (sql: string) => sql.includes("SELECT DISTINCT u.id") ? [{ id: "1" }] : []);
const service = new EstimacionesService({ query: read, transaction: async (run: (manager: object) => Promise<void>) => run({ query: write }) } as never);

@Module({ controllers: [EstimacionesController], providers: [{ provide: EstimacionesService, useValue: service }] })
class PricesTestModule {}

describe("Contrato HTTP de precios (actor y persistencia simulados)", () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    const adapter = new FastifyAdapter();
    adapter.getInstance().addHook("onRequest", async (request) => {
      (request as unknown as AuthenticatedRequest).user = {
        userId: "1", roles: [String(request.headers["x-test-role"] ?? "ADMIN")]
      } as AuthenticatedRequest["user"];
    });
    app = await NestFactory.create<NestFastifyApplication>(PricesTestModule, adapter, { logger: false });
    app.useGlobalPipes(createGlobalValidationPipe());
    app.useGlobalGuards(new RolesGuard(new Reflector()));
    await app.init();
    await adapter.getInstance().ready();
  });
  beforeEach(() => { read.mockClear(); write.mockClear(); });
  afterAll(async () => { await app?.close(); });

  it("devuelve el envelope y semana normalizada sin rango", async () => {
    const response = await app.inject({ method: "GET", url: "/estimaciones/semanas/2027-01-01/precios" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ success: true, data: { startDate: "2026-12-28", endDate: "2027-01-03", priceRange: null } });
  });
  it.each(["ADMIN", "ANALISTA"])("permite guardar a %s con actor del contexto", async (role) => {
    const response = await app.inject({ method: "PUT", url: "/estimaciones/semanas/2026-10-21/precios", headers: { "x-test-role": role }, payload: { precioMinimo: 20.5, precioMaximo: 30 } });
    expect(response.statusCode).toBe(200);
    expect(write).toHaveBeenLastCalledWith(expect.stringContaining("INSERT INTO estimaciones_precios"), ["2026-10-19", "2026-10-25", 20.5, 30, "1"]);
  });
  it.each(["AGRONOMO", "TESORERO_PAGOS"])("deniega lectura y escritura a %s antes de persistencia", async (role) => {
    for (const method of ["GET", "PUT"] as const) {
      const response = await app.inject({ method, url: "/estimaciones/semanas/2026-10-21/precios", headers: { "x-test-role": role }, ...(method === "PUT" ? { payload: { precioMinimo: 1, precioMaximo: 2 } } : {}) });
      expect(response.statusCode).toBe(403);
    }
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
  it.each([{}, { precioMinimo: 1 }, { precioMinimo: null, precioMaximo: 2 }, { precioMinimo: 3, precioMaximo: 2 }, { precioMinimo: -1, precioMaximo: 2 }, { precioMinimo: 1.001, precioMaximo: 2 }, { precioMinimo: "", precioMaximo: "" }, { precioMinimo: false, precioMaximo: true }, { precioMinimo: 1, precioMaximo: 2, actorUserId: "otro" }])("rechaza payload inválido %j sin escribir", async (payload) => {
    const response = await app.inject({ method: "PUT", url: "/estimaciones/semanas/2026-10-21/precios", payload });
    expect(response.statusCode).toBe(400);
    expect(write).not.toHaveBeenCalled();
  });
  it("retira el rango enviando ambos null", async () => {
    const response = await app.inject({ method: "PUT", url: "/estimaciones/semanas/2026-10-21/precios", payload: { precioMinimo: null, precioMaximo: null } });
    expect(response.statusCode).toBe(200);
    expect(write).toHaveBeenLastCalledWith(expect.stringContaining("SET activo = false"), ["2026-10-19", "1"]);
  });
  it.each(["2026-02-30", "no-es-fecha"])("rechaza fecha %s", async (date) => {
    expect((await app.inject({ method: "GET", url: `/estimaciones/semanas/${date}/precios` })).statusCode).toBe(400);
    expect(read).not.toHaveBeenCalled();
  });
});
