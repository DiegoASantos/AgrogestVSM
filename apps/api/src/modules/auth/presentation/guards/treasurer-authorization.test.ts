import "reflect-metadata";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";

import { RolesGuard } from "./roles.guard";
import { ProductoresController } from "../../../productores/presentation/productores.controller";
import { ParcelasController } from "../../../parcelas/presentation/parcelas.controller";
import { AdminAcreedoresCosechaController, PagosProductoresController } from "../../../comercial/presentation/pagos-productores.controller";
import { RecepcionesSystraceController } from "../../../comercial/presentation/recepciones-systrace.controller";
import { EstimacionesController } from "../../../estimaciones/presentation/estimaciones.controller";
import { UsersController } from "../../../users/presentation/users.controller";
import { SectoresController } from "../../../sectores/presentation/sectores.controller";
import { SubsectoresController } from "../../../subsectores/presentation/subsectores.controller";
import { TiposDocumentoController } from "../../../tipos-documento/presentation/tipos-documento.controller";
import { AuthController } from "../auth.controller";

const guard = new RolesGuard(new Reflector());
function check(controller: object, handler: object, roles = ["TESORERO_PAGOS"], method = "GET") {
  return guard.canActivate({
    getClass: () => controller,
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => ({ method, user: { roles } }) })
  } as unknown as ExecutionContext);
}

describe("Autorización Tesorero Pagos", () => {
  for (const controller of [PagosProductoresController, AdminAcreedoresCosechaController, RecepcionesSystraceController]) {
    it(`permite todas las operaciones de ${controller.name}, también combinado con ANALISTA`, () => {
      for (const name of Object.getOwnPropertyNames(controller.prototype).filter((name) => name !== "constructor")) {
        const handler = (controller.prototype as unknown as Record<string, object>)[name];
        expect(check(controller, handler, ["TESORERO_PAGOS"], "POST")).toBe(true);
        expect(check(controller, handler, ["TESORERO_PAGOS", "ANALISTA"], "POST")).toBe(true);
      }
    });
  }
  for (const controller of [ProductoresController, ParcelasController]) {
    it(`gestiona ${controller.name} sin habilitar historiales de visitas`, () => {
      for (const name of Object.getOwnPropertyNames(controller.prototype).filter((name) => name !== "constructor")) {
        const handler = (controller.prototype as unknown as Record<string, object>)[name];
        if (name.includes("VisitHistory")) {
          expect(() => check(controller, handler)).toThrow(ForbiddenException);
        } else {
          expect(check(controller, handler)).toBe(true);
        }
      }
    });
  }
  it("consulta catálogos auxiliares pero no permite mantenerlos", () => {
    for (const controller of [SectoresController, SubsectoresController, TiposDocumentoController]) {
      const prototype = controller.prototype as unknown as Record<string, object>;
      for (const name of Object.getOwnPropertyNames(prototype).filter((name) => name !== "constructor")) {
        if (name.startsWith("get")) expect(check(controller, prototype[name])).toBe(true);
        else expect(() => check(controller, prototype[name], undefined, "POST")).toThrow(ForbiddenException);
      }
    }
    expect(check(UsersController, UsersController.prototype.getActiveAgronomists)).toBe(true);
    expect(() => check(UsersController, UsersController.prototype.getUsers)).toThrow(ForbiddenException);
  });
  it("deniega Estimaciones incluyendo precios, conserva accesos de otros roles", () => {
    for (const handler of [EstimacionesController.prototype.getWeek, EstimacionesController.prototype.getWeekPrices, EstimacionesController.prototype.saveWeekPrices]) {
      expect(() => check(EstimacionesController, handler)).toThrow(ForbiddenException);
      expect(check(EstimacionesController, handler, ["TESORERO_PAGOS", "ADMIN"], "PUT")).toBe(true);
    }
    expect(check(EstimacionesController, EstimacionesController.prototype.saveWeekPrices, ["ANALISTA"], "PUT")).toBe(true);
  });
  it("deniega por defecto handlers sin roles y conserva el perfil personal", () => {
    expect(() => check(class {}, () => undefined)).toThrow(ForbiddenException);
    expect(check(AuthController, AuthController.prototype.getAuthenticatedUser)).toBe(true);
    expect(check(AuthController, AuthController.prototype.updateAuthenticatedUser, undefined, "PATCH")).toBe(true);
    expect(() => check(AuthController, AuthController.prototype.getStatus)).toThrow(ForbiddenException);
    expect(check(class {}, () => undefined, ["TESORERO_PAGOS", "AGRONOMO"])).toBe(true);
  });
});
