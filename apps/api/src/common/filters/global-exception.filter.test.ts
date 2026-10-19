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

  it("logs only safe error metadata for a financial route", () => {
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

    const databaseError = Object.assign(
      new Error("sensitive database values 123456"),
      {
        driverError: {
          code: "23503",
          constraint: "fk_payment_creditor"
        }
      }
    );
    new GlobalExceptionFilter(true, logger as never).catch(
      databaseError,
      host as never
    );

    expect(JSON.stringify(sent)).not.toContain("sensitive database values");
    expect(logger.error.mock.calls[0]?.[0]).not.toHaveProperty("error");
    expect(logger.error.mock.calls[0]?.[0]).toMatchObject({
      errorClass: "Error",
      sqlState: "23503",
      constraint: "fk_payment_creditor"
    });
  });

  it("does not log SQL, bound parameters or stack traces on other routes", () => {
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    const reply = {
      header: vi.fn(),
      status: vi.fn(() => reply),
      send: vi.fn()
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ url: "/notificaciones/operativas", method: "GET", headers: {} }),
        getResponse: () => reply
      })
    };
    const databaseError = Object.assign(new Error("statement with user details"), {
      query: "SELECT * FROM usuarios WHERE public_id = $1",
      parameters: ["private-user-id"],
      driverError: { code: "42601" }
    });

    new GlobalExceptionFilter(true, logger as never).catch(databaseError, host as never);

    const loggedException = logger.error.mock.calls[0]?.[0];
    expect(loggedException).toMatchObject({ errorClass: "Error", sqlState: "42601" });
    expect(loggedException).not.toHaveProperty("error");
    expect(JSON.stringify(loggedException)).not.toContain("SELECT");
    expect(JSON.stringify(loggedException)).not.toContain("private-user-id");
    expect(JSON.stringify(loggedException)).not.toContain("statement with user details");
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
