import { describe, expect, it } from "vitest";
import { calculatePaymentDetail } from "./calculo-detalle-pago";

const base = {
  jabasRecepcion: 100,
  pesoNetoRecepcion: "2000.00",
  cantidadJabas: 40,
  precioJaba: "40.00",
  precioKilo: "2.00",
  precioBase: "JABA" as const,
  porcentajePeso: "80.00",
  tipoDescuento: "CLP",
  montoDescuento: "100.00",
  detraccion: "20.00"
};

describe("calculatePaymentDetail", () => {
  it("derives kilos and money from the reception weight and allocated crates", () => {
    expect(calculatePaymentDetail(base)).toMatchObject({
      precioJaba: "40.000000",
      precioKilo: "2.000000",
      subTotal: "640.000000",
      montoDescuento: "100.00",
      totalPostDescuento: "1180.00",
      totalPostDetraccion: "1160.00"
    });
  });

  it("derives crate price from kilo price without changing the entered price", () => {
    expect(calculatePaymentDetail({
      ...base, precioBase: "KILO", precioKilo: "1.755", precioJaba: "35.10",
      tipoDescuento: "NO_APLICA", montoDescuento: "0", detraccion: "0"
    })).toMatchObject({
      precioJaba: "35.100000",
      precioKilo: "1.755000",
      totalPostDescuento: "1123.20"
    });
  });

  it("calculates an advance discount with the same positive amount rule", () => {
    expect(calculatePaymentDetail({ ...base, tipoDescuento: "ANTICIPO" })).toMatchObject({
      tipoDescuento: "ANTICIPO",
      montoDescuento: "100.00",
      totalPostDescuento: "1180.00"
    });
    expect(() => calculatePaymentDetail({
      ...base, tipoDescuento: "ANTICIPO", montoDescuento: "0"
    })).toThrow("descuento");
  });

  it.each([
    [{ porcentajePeso: "0" }, "porcentaje"],
    [{ porcentajePeso: "100.01" }, "porcentaje"],
    [{ cantidadJabas: 0 }, "jabas"],
    [{ tipoDescuento: "NO_APLICA", montoDescuento: "1" }, "monto"],
    [{ tipoDescuento: "CLP", montoDescuento: "0" }, "descuento"],
    [{ detraccion: "2000" }, "detracción"],
    [{ precioKilo: "3" }, "precios"]
  ])("rejects invalid financial input", (update, expected) => {
    expect(() => calculatePaymentDetail({ ...base, ...update })).toThrow(expected);
  });
});
