import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { VisitasCampoService } from "./visitas-campo.service";

describe("VisitasCampoService", () => {
  it("rejects an update that tries to remove the phenological stage", async () => {
    await expect(
      VisitasCampoService.prototype.update.call({} as VisitasCampoService, "1", {
        phenologicalStageId: null as never
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
