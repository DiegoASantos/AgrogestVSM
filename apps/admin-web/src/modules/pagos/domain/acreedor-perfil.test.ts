import { describe, expect, it } from "vitest";
import { creditorSaveAction } from "./acreedor-perfil";
import type { AcreedorCosecha, AcreedorCosechaPayload } from "../types/pagos.types";

const form: AcreedorCosechaPayload = { productorId: "producer-1", nombres: "Ana",
  apellidos: "Prueba", tipoDocumento: "DNI", nroDocumento: "12345678",
  banco: "BCP", nroCuenta: "111222" };
const chosen = { ...form, id: "creditor-1" } as AcreedorCosecha;

describe("creditor prefill", () => {
  it("copies another producer's profile without updating the original", () => {
    expect(creditorSaveAction(form, { ...chosen, productorId: "producer-2" })).toBe("create");
  });
  it("selects an unchanged own profile or updates a changed one", () => {
    expect(creditorSaveAction(form, chosen)).toBe("select");
    expect(creditorSaveAction({ ...form, banco: "BBVA" }, chosen)).toBe("update");
  });
});
