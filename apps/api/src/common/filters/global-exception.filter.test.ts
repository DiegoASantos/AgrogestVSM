import { describe, expect, it, vi } from "vitest";
import {
  GlobalExceptionFilter,
  isSensitiveFinancialRoute,
  safeFinancialValidationMessage
} from "./global-exception.filter";

describe("sensitive financial route detection", () => {
  it.each([
    "/pagos/productores",
    "/pagos/productores/uuid/detalles?debug=true",
    "/comercial/mantenimiento/acreedores-cosecha",
    "/comercial/mantenimiento/acreedores-cosecha/uuid"
  ])("marks %s as sensitive", (path) => {
    expect(isSensitiveFinancialRoute(path)).toBe(true);
  });

  it.each(["/comercial/revision-acreedores", "/productores", "/pagos-cosecha"])(
    "does not mark %s as a sensitive financial route",
    (path) => expect(isSensitiveFinancialRoute(path)).toBe(false)
  );

  it("does not return or log exception details for a financial route", () => {
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const sent: unknown[] = [];
    const reply = {
      header: vi.fn(),
      status: vi.fn(() => reply),
      send: vi.fn((body: unknown) => sent.push(body))
    };
    const request = {
      url: "/pagos/productores",
      method: "POST",
      headers: {}
    };
    const host = {
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => reply })
    };

    new GlobalExceptionFilter(true, logger as never).catch(
      new Error("sensitive database values"),
      host as never
    );

    expect(JSON.stringify(sent)).not.toContain("sensitive database values");
    expect(logger.error.mock.calls[0]?.[0]).not.toHaveProperty("error");
  });

  it("names only safe payment fields, never submitted values", () => {
    expect(safeFinancialValidationMessage([
      { field: "detalles.0.acreedorId", messages: ["private account 123456"] }
    ])).toBe("Revisa el detalle 1: acreedor aprobado.");
    expect(safeFinancialValidationMessage([
      { field: "detalles.0.somePrivateField", messages: ["private account 123456"] }
    ])).toBe("Revisa los campos del formulario.");
  });
});
