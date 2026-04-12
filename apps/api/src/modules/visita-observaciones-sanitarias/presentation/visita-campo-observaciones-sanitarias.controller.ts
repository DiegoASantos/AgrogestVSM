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
import { VisitaObservacionesSanitariasService } from "../application/visita-observaciones-sanitarias.service";
import { CreateVisitaObservacionSanitariaDto } from "./dto/create-visita-observacion-sanitaria.dto";

@ApiTags("Observaciones Sanitarias")
@Controller("visitas-campo")
export class VisitaCampoObservacionesSanitariasController {
  constructor(
    private readonly observacionesSanitariasService: VisitaObservacionesSanitariasService
  ) {}

  @Post(":visitaId/observaciones-sanitarias")
  @ApiOperation({
    summary: "Crea una observacion sanitaria asociada a una visita."
  })
  @ApiParam({
    name: "visitaId",
    type: String,
    example: "1"
  })
  @ApiCreatedResponse({
    description: "Observacion sanitaria creada."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o referencias inexistentes."
  })
  @ApiConflictResponse({
    description:
      "Ya existe una observacion para la misma plaga o enfermedad en la visita."
  })
  createObservacionSanitaria(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string,
    @Body() createDto: CreateVisitaObservacionSanitariaDto
  ) {
    return this.observacionesSanitariasService.create(visitaId, createDto);
  }

  @Get(":visitaId/observaciones-sanitarias")
  @ApiOperation({
    summary: "Lista las observaciones sanitarias de una visita."
  })
  @ApiParam({
    name: "visitaId",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Lista de observaciones sanitarias."
  })
  @ApiNotFoundResponse({
    description: "La visita no existe."
  })
  getObservacionesSanitariasByVisitaId(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string
  ) {
    return this.observacionesSanitariasService.findByVisitaId(visitaId);
  }
}
