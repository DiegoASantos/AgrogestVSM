import { describe, expect, it } from "vitest";
import { calculatedAmounts, derivedPrice } from "./calculo-detalle-pago";

describe("payment detail preview", () => {
  it("converts both prices without losing the fourth entered decimal", () => {
    expect(derivedPrice("35.1234", "JABA")).toBe("1.75617");
    expect(derivedPrice("1.75617", "KILO")).toBe("35.1234");
  });

  it("matches the server's weight, discount and withholding example", () => {
    expect(calculatedAmounts({
      cantidadJabas: "40", porcentajePeso: "80.00", precioKilo: "2.00",
      tipoDescuento: "CLP", montoDescuento: "100.00", detraccion: "20.00"
    }, { jabas: "100", pesoNeto: "2000.00" })).toEqual({
      subTotal: "640.000000",
      totalPostDescuento: "1180.00",
      totalPostDetraccion: "1160.00"
    });
  });
});
