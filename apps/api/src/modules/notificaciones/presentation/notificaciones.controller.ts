import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";

import { AllowAnalystMutation } from "../../auth/presentation/decorators/allow-analyst-mutation.decorator";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { NotificacionesService } from "../application/notificaciones.service";
import { MarcarVisitaDuplicadaLeidaDto } from "./dto/marcar-visita-duplicada-leida.dto";

@ApiTags("Notificaciones")
@Roles("ADMIN", "ANALISTA")
@Controller("notificaciones")
export class NotificacionesController {
  constructor(private readonly service: NotificacionesService) {}

  @Get("operativas")
  @ApiOperation({ summary: "Avisos de visitas repetidas y productores sin seguimiento." })
  @ApiOkResponse({ description: "Pagina de avisos operativos y conteo pendiente." })
  @ApiBadRequestResponse({ description: "Paginacion invalida." })
  @ApiForbiddenResponse({ description: "Solo ADMIN y ANALISTA." })
  list(
    @CurrentAuthUser() user: AccessTokenPayload,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string
  ) {
    return this.service.list(user.userId, limit, cursor);
  }

  @Post("visitas-duplicadas/lectura")
  @AllowAnalystMutation()
  @ApiOperation({ summary: "Marca como leido un aviso de visitas repetidas para el usuario actual." })
  @ApiOkResponse({ description: "Lectura registrada para el usuario autenticado." })
  @ApiBadRequestResponse({ description: "Identificador o fecha invalida." })
  @ApiNotFoundResponse({ description: "El grupo ya no tiene dos visitas activas." })
  @ApiForbiddenResponse({ description: "Solo ADMIN y ANALISTA." })
  markRead(
    @CurrentAuthUser() user: AccessTokenPayload,
    @Body() dto: MarcarVisitaDuplicadaLeidaDto
  ) {
    return this.service.markRead(user.userId, dto);
  }
}
