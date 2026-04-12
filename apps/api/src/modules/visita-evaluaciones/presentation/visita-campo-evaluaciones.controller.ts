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
import { VisitaEvaluacionesService } from "../application/visita-evaluaciones.service";
import { CreateVisitaEvaluacionDto } from "./dto/create-visita-evaluacion.dto";

@ApiTags("Evaluaciones")
@Controller("visitas-campo")
export class VisitaCampoEvaluacionesController {
  constructor(
    private readonly visitaEvaluacionesService: VisitaEvaluacionesService
  ) {}

  @Post(":visitaId/evaluaciones")
  @ApiOperation({ summary: "Crea una evaluacion asociada a una visita." })
  @ApiParam({
    name: "visitaId",
    type: String,
    example: "1"
  })
  @ApiCreatedResponse({
    description: "Evaluacion creada."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o visita inexistente."
  })
  @ApiConflictResponse({
    description: "Ya existe una evaluacion con el mismo orden para la visita."
  })
  createEvaluacion(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string,
    @Body() createVisitaEvaluacionDto: CreateVisitaEvaluacionDto
  ) {
    return this.visitaEvaluacionesService.create(
      visitaId,
      createVisitaEvaluacionDto
    );
  }

  @Get(":visitaId/evaluaciones")
  @ApiOperation({ summary: "Lista las evaluaciones de una visita." })
  @ApiParam({
    name: "visitaId",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Lista de evaluaciones."
  })
  @ApiNotFoundResponse({
    description: "La visita no existe."
  })
  getEvaluacionesByVisitaId(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string
  ) {
    return this.visitaEvaluacionesService.findByVisitaId(visitaId);
  }
}
