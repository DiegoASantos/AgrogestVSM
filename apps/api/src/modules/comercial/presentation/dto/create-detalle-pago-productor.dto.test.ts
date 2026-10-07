import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateDetallePagoProductorDto } from "./create-detalle-pago-productor.dto";

const detail = {
  acreedorId: "550e8400-e29b-41d4-a716-446655440000",
  tipoDocumentoProductor: "DNI",
  nroDocumentoProductor: "12345678",
  cantidadJabas: 10,
  precioJaba: "5.00",
  precioKilo: "1.25",
  porcentajePeso: "0.00",
  aplicaFairtrade: false,
  supervisorId: "550e8400-e29b-41d4-a716-446655440001",
  subTotal: "50.00",
  tipoDescuento: "NO_APLICA",
  montoDescuento: "0.00",
  totalPostDescuento: "50.00",
  detraccion: "0.00",
  totalPostDetraccion: "50.00",
  nroLiquidacion: null,
  observacion: "Captura manual"
};

describe("CreateDetallePagoProductorDto", () => {
  it.each(["0", "0.00", "37.25", "100", "100.00"])(
    "accepts a weight percentage of %s without requiring a sum across details",
    async (porcentajePeso) => {
      const dto = plainToInstance(CreateDetallePagoProductorDto, {
        ...detail,
        porcentajePeso
      });
      expect(await validate(dto)).toEqual([]);
    }
  );

  it.each(["-0.01", "100.01", "101", "01.00"])(
    "rejects an invalid weight percentage of %s",
    async (porcentajePeso) => {
      const dto = plainToInstance(CreateDetallePagoProductorDto, {
        ...detail,
        porcentajePeso
      });
      const errors = await validate(dto);
      expect(errors.some((error) => error.property === "porcentajePeso")).toBe(true);
    }
  );
});
