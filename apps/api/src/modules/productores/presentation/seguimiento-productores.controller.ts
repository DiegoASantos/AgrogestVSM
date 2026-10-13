import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { SeguimientoProductoresService } from "../application/seguimiento-productores.service";
import { ResponderSeguimientoDto } from "./dto/responder-seguimiento.dto";

@ApiTags("Productores")
@Controller("productores")
export class SeguimientoProductoresController {
  constructor(private readonly service: SeguimientoProductoresService) {}

  @Get("seguimiento-pendiente")
  @Roles("AGRONOMO")
  @ApiOperation({ summary: "Lista avisos informativos de continuidad vencidos." })
  findPending(@CurrentAuthUser() user: AccessTokenPayload) {
    return this.service.findPending(user);
  }

  @Post(":id/seguimiento")
  @Roles("AGRONOMO")
  @ApiOperation({ summary: "Registra continuidad o desactiva las parcelas asignadas." })
  respond(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() body: ResponderSeguimientoDto,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    return this.service.respond(id, body.decision, user);
  }
}
