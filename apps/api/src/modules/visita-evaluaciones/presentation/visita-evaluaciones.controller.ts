import { Body, Controller, Delete, Get, Param, Patch } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { VisitaEvaluacionesService } from "../application/visita-evaluaciones.service";
import { UpdateVisitaEvaluacionDto } from "./dto/update-visita-evaluacion.dto";

@ApiTags("Evaluaciones")
@Controller("evaluaciones")
export class VisitaEvaluacionesController {
  constructor(
    private readonly visitaEvaluacionesService: VisitaEvaluacionesService
  ) {}

  @Get(":id")
  @ApiOperation({ summary: "Obtiene una evaluacion por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Evaluacion encontrada."
  })
  @ApiNotFoundResponse({
    description: "La evaluacion no existe."
  })
  getEvaluacionById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.visitaEvaluacionesService.findById(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualiza una evaluacion de visita." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Evaluacion actualizada."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos."
  })
  @ApiConflictResponse({
    description: "Ya existe otra evaluacion con el mismo orden en la visita."
  })
  @ApiNotFoundResponse({
    description: "La evaluacion no existe."
  })
  updateEvaluacion(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateVisitaEvaluacionDto: UpdateVisitaEvaluacionDto
  ) {
    return this.visitaEvaluacionesService.update(id, updateVisitaEvaluacionDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Elimina una evaluacion de visita." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Evaluacion eliminada."
  })
  @ApiNotFoundResponse({
    description: "La evaluacion no existe."
  })
  deleteEvaluacion(@Param("id", ParseEntityIdPipe) id: string) {
    return this.visitaEvaluacionesService.remove(id);
  }
}
