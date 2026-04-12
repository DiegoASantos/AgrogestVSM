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
import { VisitaRecomendacionesService } from "../application/visita-recomendaciones.service";
import { UpdateVisitaRecomendacionDto } from "./dto/update-visita-recomendacion.dto";

@ApiTags("Recomendaciones de Visita")
@Controller("recomendaciones-visita")
export class VisitaRecomendacionesController {
  constructor(
    private readonly visitaRecomendacionesService: VisitaRecomendacionesService
  ) {}

  @Get(":id")
  @ApiOperation({ summary: "Obtiene una recomendacion por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Recomendacion encontrada."
  })
  @ApiNotFoundResponse({
    description: "La recomendacion no existe."
  })
  getRecomendacionById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.visitaRecomendacionesService.findById(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualiza una recomendacion." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Recomendacion actualizada."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o referencias inexistentes."
  })
  @ApiConflictResponse({
    description:
      "Ya existe otra recomendacion del mismo tipo para la visita."
  })
  @ApiNotFoundResponse({
    description: "La recomendacion no existe."
  })
  updateRecomendacion(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateDto: UpdateVisitaRecomendacionDto
  ) {
    return this.visitaRecomendacionesService.update(id, updateDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Elimina una recomendacion." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Recomendacion eliminada."
  })
  @ApiNotFoundResponse({
    description: "La recomendacion no existe."
  })
  deleteRecomendacion(@Param("id", ParseEntityIdPipe) id: string) {
    return this.visitaRecomendacionesService.remove(id);
  }
}
