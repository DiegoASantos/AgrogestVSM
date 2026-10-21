import "reflect-metadata";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it, vi } from "vitest";

import { EstimacionesService } from "./estimaciones.service";
import { SaveWeekPricesDto } from "../presentation/dto/save-week-prices.dto";

function setup(actorAllowed = true) {
  const query = vi.fn().mockResolvedValue([]);
  const managerQuery = vi.fn().mockResolvedValueOnce(actorAllowed ? [{ id: "1" }] : []).mockResolvedValue([]);
  const transaction = vi.fn(async (run) => run({ query: managerQuery }));
  const service = new EstimacionesService({ query, transaction } as never);
  return { service, query, managerQuery, transaction };
}

describe("Precios semanales", () => {
  it("consulta una semana sin precio ni agrónomos, incluyendo cambio de año", async () => {
    const { service, query } = setup();
    await expect(service.getWeekPrices("2027-01-01")).resolves.toEqual({
      startDate: "2026-12-28", endDate: "2027-01-03", priceRange: null
    });
    expect(query).toHaveBeenCalledWith(expect.any(String), ["2026-12-28"]);
  });

  it("convierte numeric de PostgreSQL y conserva auditoría", async () => {
    const { service, query } = setup();
    query.mockResolvedValue([{ precioMinimo: "20.50", precioMaximo: "30.00", publicId: "id", updatedByName: "Editor" }]);
    expect((await service.getWeekPrices("2026-10-21")).priceRange).toMatchObject({
      precioMinimo: 20.5, precioMaximo: 30, publicId: "id", updatedByName: "Editor"
    });
  });

  it.each([[0, 0], [20.5, 30], [9999999999.99, 9999999999.99]])("guarda y actualiza atómicamente %s–%s", async (precioMinimo, precioMaximo) => {
    const { service, managerQuery } = setup();
    await service.saveWeekPrices("2026-10-21", { precioMinimo, precioMaximo }, "1");
    expect(managerQuery).toHaveBeenLastCalledWith(expect.stringContaining("ON CONFLICT (fecha_inicio) DO UPDATE"),
      ["2026-10-19", "2026-10-25", precioMinimo, precioMaximo, "1"]);
  });

  it("retira lógicamente con auditoría", async () => {
    const { service, managerQuery } = setup();
    await service.saveWeekPrices("2026-10-21", { precioMinimo: null, precioMaximo: null }, "1");
    expect(managerQuery).toHaveBeenLastCalledWith(expect.stringContaining("SET activo = false"), ["2026-10-19", "1"]);
  });

  it.each([
    [null, 20], [20, null], [-1, 20], [21, 20], [1.001, 20], [0.000001, 20],
    [NaN, 20], [1, Infinity], [1, 10000000000], [undefined, undefined], ["1", "20"]
  ])("rechaza rango inválido %s–%s antes de escribir", async (min, max) => {
    const { service, transaction } = setup();
    await expect(service.saveWeekPrices("2026-10-21", { precioMinimo: min, precioMaximo: max } as never, "1")).rejects.toThrow(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("verifica que el editor siga activo y autorizado", async () => {
    const { service, managerQuery } = setup(false);
    await expect(service.saveWeekPrices("2026-10-21", { precioMinimo: 1, precioMaximo: 2 }, "1")).rejects.toThrow(ForbiddenException);
    expect(managerQuery).toHaveBeenCalledTimes(1);
  });

  it.each([{}, { precioMinimo: 1 }, { precioMinimo: "1", precioMaximo: "2" }, { precioMinimo: 1.001, precioMaximo: 2 }])("valida DTO sin coerción de campos ausentes o strings: %j", async (body) => {
    expect(await validate(plainToInstance(SaveWeekPricesDto, body))).not.toHaveLength(0);
  });
});
