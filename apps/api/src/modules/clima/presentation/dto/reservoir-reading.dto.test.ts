import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";

import { CreateReservoirReadingDto } from "./create-reservoir-reading.dto";
import { FindReservoirHistoryQueryDto } from "./find-reservoir-history-query.dto";
import { UpdateReservoirReadingDto } from "./update-reservoir-reading.dto";

describe("reservoir reading DTOs", () => {
  it("accepts and transforms a valid manual reading", async () => {
    const dto = plainToInstance(CreateReservoirReadingDto, {
      variable: "volumen_mmc",
      valor: "512.4",
      unidad: " MMC ",
      tipo: "OBSERVADO",
      dato_at: "2026-08-11T08:00:00-05:00"
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ valor: 512.4, unidad: "MMC" });
  });

  it.each([
    { variable: "desconocida" },
    { valor: -1 },
    { valor: null },
    { valor: true },
    { valor: "" },
    { unidad: "x".repeat(21) },
    { tipo: "MANUAL" },
    { dato_at: "ayer" }
  ])("rejects invalid create field %#", async (override) => {
    const dto = plainToInstance(CreateReservoirReadingDto, {
      variable: "volumen_mmc",
      valor: 512.4,
      unidad: "MMC",
      tipo: "OBSERVADO",
      dato_at: "2026-08-11T08:00:00-05:00",
      ...override
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it("allows a partial update but validates supplied fields", async () => {
    const valid = plainToInstance(UpdateReservoirReadingDto, { valor: 400 });
    const invalid = plainToInstance(UpdateReservoirReadingDto, {
      tipo: "DESCONOCIDO"
    });

    expect(await validate(valid)).toHaveLength(0);
    expect(await validate(invalid)).not.toHaveLength(0);
  });

  it.each([null, true, ""])(
    "rejects unsafe update numeric coercion: %s",
    async (valor) => {
      const dto = plainToInstance(
        UpdateReservoirReadingDto,
        { valor },
        { enableImplicitConversion: true }
      );

      expect(await validate(dto)).not.toHaveLength(0);
    }
  );

  it.each(["2026-08-11", "2026-08-11T08:00:00"])(
    "rejects timestamps without an explicit timezone: %s",
    async (datoAt) => {
      const create = plainToInstance(CreateReservoirReadingDto, {
        variable: "volumen_mmc",
        valor: 512.4,
        unidad: "MMC",
        dato_at: datoAt
      });
      const history = plainToInstance(FindReservoirHistoryQueryDto, {
        desde: datoAt
      });

      expect(await validate(create)).not.toHaveLength(0);
      expect(await validate(history)).not.toHaveLength(0);
    }
  );

  it("validates history filters", async () => {
    const valid = plainToInstance(FindReservoirHistoryQueryDto, {
      variable: "cota_msnm",
      desde: "2026-08-01T00:00:00-05:00"
    });
    const invalid = plainToInstance(FindReservoirHistoryQueryDto, {
      variable: "temperatura",
      hasta: "mañana"
    });

    expect(await validate(valid)).toHaveLength(0);
    expect(await validate(invalid)).not.toHaveLength(0);
  });
});
