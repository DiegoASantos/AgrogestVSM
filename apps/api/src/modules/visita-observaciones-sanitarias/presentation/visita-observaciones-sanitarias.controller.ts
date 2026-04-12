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
import { VisitaObservacionesSanitariasService } from "../application/visita-observaciones-sanitarias.service";
import { UpdateVisitaObservacionSanitariaDto } from "./dto/update-visita-observacion-sanitaria.dto";

@ApiTags("Observaciones Sanitarias")
@Controller("observaciones-sanitarias")
export class VisitaObservacionesSanitariasController {
  constructor(
    private readonly observacionesSanitariasService: VisitaObservacionesSanitariasService
  ) {}

  @Get(":id")
  @ApiOperation({ summary: "Obtiene una observacion sanitaria por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Observacion sanitaria encontrada."
  })
  @ApiNotFoundResponse({
    description: "La observacion sanitaria no existe."
  })
  getObservacionSanitariaById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.observacionesSanitariasService.findById(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualiza una observacion sanitaria." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Observacion sanitaria actualizada."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o referencias inexistentes."
  })
  @ApiConflictResponse({
    description:
      "Ya existe otra observacion para la misma plaga o enfermedad en la visita."
  })
  @ApiNotFoundResponse({
    description: "La observacion sanitaria no existe."
  })
  updateObservacionSanitaria(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateDto: UpdateVisitaObservacionSanitariaDto
  ) {
    return this.observacionesSanitariasService.update(id, updateDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Elimina una observacion sanitaria." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Observacion sanitaria eliminada."
  })
  @ApiNotFoundResponse({
    description: "La observacion sanitaria no existe."
  })
  deleteObservacionSanitaria(@Param("id", ParseEntityIdPipe) id: string) {
    return this.observacionesSanitariasService.remove(id);
  }
}
