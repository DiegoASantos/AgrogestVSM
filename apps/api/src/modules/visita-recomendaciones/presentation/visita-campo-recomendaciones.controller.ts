import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { VisitaRecomendacionesService } from "../application/visita-recomendaciones.service";
import { CreateVisitaRecomendacionDto } from "./dto/create-visita-recomendacion.dto";

@ApiTags("Recomendaciones de Visita")
@Controller("visitas-campo")
export class VisitaCampoRecomendacionesController {
  constructor(
    private readonly visitaRecomendacionesService: VisitaRecomendacionesService
  ) {}

  @Post(":visitaId/recomendaciones")
  @ApiOperation({
    summary: "Crea una recomendacion asociada a una visita."
  })
  @ApiParam({
    name: "visitaId",
    type: String,
    example: "1"
  })
  @ApiCreatedResponse({
    description: "Recomendacion creada."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o referencias inexistentes."
  })
  @ApiConflictResponse({
    description:
      "Ya existe una recomendacion del mismo tipo para la visita."
  })
  createRecomendacion(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string,
    @Body() createDto: CreateVisitaRecomendacionDto
  ) {
    return this.visitaRecomendacionesService.create(visitaId, createDto);
  }

  @Get(":visitaId/recomendaciones")
  @ApiOperation({
    summary: "Lista las recomendaciones de una visita."
  })
  @ApiParam({
    name: "visitaId",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Lista de recomendaciones."
  })
  @ApiNotFoundResponse({
    description: "La visita no existe."
  })
  getRecomendacionesByVisitaId(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string
  ) {
    return this.visitaRecomendacionesService.findByVisitaId(visitaId);
  }
}
