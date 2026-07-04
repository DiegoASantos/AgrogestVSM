import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { VisitaCalificacionesService } from "../application/visita-calificaciones.service";
import { UpsertVisitaCalificacionDto } from "./dto/upsert-visita-calificacion.dto";

@ApiTags("Calificaciones de visita")
@Controller("visitas-campo")
export class VisitaCampoCalificacionesController {
  constructor(
    private readonly calificacionesService: VisitaCalificacionesService
  ) {}

  @Post(":visitaId/calificaciones")
  @ApiOperation({ summary: "Crea o actualiza una calificacion de cumplimiento." })
  @ApiParam({ name: "visitaId", type: String, example: "1" })
  @ApiCreatedResponse({ description: "Calificacion guardada." })
  @ApiBadRequestResponse({ description: "Datos invalidos o visita inexistente." })
  upsertCalificacion(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string,
    @Body() dto: UpsertVisitaCalificacionDto
  ) {
    return this.calificacionesService.upsert(visitaId, dto);
  }

  @Get(":visitaId/calificaciones")
  @ApiOperation({ summary: "Lista calificaciones de una visita." })
  @ApiParam({ name: "visitaId", type: String, example: "1" })
  @ApiOkResponse({ description: "Calificaciones de la visita." })
  @ApiNotFoundResponse({ description: "La visita no existe." })
  getCalificaciones(@Param("visitaId", ParseEntityIdPipe) visitaId: string) {
    return this.calificacionesService.findByVisitaId(visitaId);
  }
}
