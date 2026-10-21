import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { ALLOW_ANALYST_MUTATION_KEY } from "../../auth/presentation/decorators/allow-analyst-mutation.decorator";
import { REQUIRED_ROLES_KEY } from "../../auth/presentation/decorators/roles.decorator";
import { RecepcionesSystraceController } from "./recepciones-systrace.controller";

describe("RecepcionesSystraceController permissions", () => {
  it("restricts reception search and link correction to ADMIN, ANALISTA and TESORERO_PAGOS", () => {
    expect(Reflect.getMetadata(REQUIRED_ROLES_KEY, RecepcionesSystraceController))
      .toEqual(["ADMIN", "ANALISTA", "TESORERO_PAGOS"]);
    expect(Reflect.getMetadata(ALLOW_ANALYST_MUTATION_KEY, RecepcionesSystraceController.prototype.link))
      .toBe(true);
  });
});
