import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { flattenValidationErrors } from "../../../../common/utils/validation-errors.util";
import { CrearPagoCompletoDto } from "./pago-productor-completo.dto";

const productorId = "550e8400-e29b-41d4-a716-446655440000";
const acreedorId = "550e8400-e29b-41d4-a716-446655440001";
const supervisorId = "550e8400-e29b-41d4-a716-446655440002";
const payment = {
  cabecera: {
    productorId, sistemaOrigen: "SYSTRACE", nroGuia: "G-1", lote: "L-1",
    protocolo: "PR", variedad: "Mango", tipoCultivo: "ORGANICO", categoria: "CAT",
    destino: "D1", fechaCosecha: "2026-10-01", fechaRecepcion: "2026-10-02",
    jabas: 10, pesoBruto: "120.00", pesoTara: "20.00", pesoNeto: "100.00",
    pesoPromedio: "10.00", exportador: "EX", codigoProductorOrigen: "P-1",
    nombreProductorOrigen: "Productor de prueba"
  },
  detalles: [{
    acreedorId, tipoDocumentoProductor: "DNI", nroDocumentoProductor: "12345678",
    cantidadJabas: 10, precioJaba: "20.00", precioKilo: "1.000000",
    precioBase: "JABA", porcentajePeso: "100.00", aplicaFairtrade: false,
    supervisorId, subTotal: "100.000000", tipoDescuento: "NO_APLICA",
    montoDescuento: "0.00", totalPostDescuento: "100.00", detraccion: "0.00",
    totalPostDetraccion: "100.00", nroLiquidacion: null,
    observacion: "", estado: "PENDIENTE", fechaPago: null
  }]
};

describe("pago completo precargado desde Systrace", () => {
  it("accepts a complete header and detail with an approved creditor reference", async () => {
    const dto = plainToInstance(CrearPagoCompletoDto, payment);
    expect(flattenValidationErrors(await validate(dto))).toEqual([]);
  });

  it("identifies the detail field when a creditor was not selected", async () => {
    const dto = plainToInstance(CrearPagoCompletoDto, {
      ...payment,
      detalles: [{ ...payment.detalles[0], acreedorId: "" }]
    });
    const issues = flattenValidationErrors(await validate(dto));
    expect(issues.some((issue) => issue.field === "detalles.0.acreedorId")).toBe(true);
  });
});
