import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { VisitasHoyService } from "../application/visitas-hoy.service";

@ApiTags("Visitas de Campo")
@Controller("visitas-campo")
export class VisitasHoyController {
  constructor(private readonly service: VisitasHoyService) {}

  @Get("parcela/:id/visitas-hoy")
  @Roles("AGRONOMO")
  @ApiOperation({ summary: "Consulta visitas de hoy para una parcela asignada." })
  findByParcela(
    @Param("id", ParseEntityIdPipe) id: string,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    return this.service.findByParcela(id, user);
  }
}
