import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { VisitaPasoObservacionesService } from "../application/visita-paso-observaciones.service";
import { UpsertVisitaPasoObservacionDto } from "./dto/upsert-visita-paso-observacion.dto";

@ApiTags("Visita - Observaciones por Paso")
@Controller("visitas-campo")
export class VisitaPasoObservacionesController {
  constructor(
    private readonly stepNotesService: VisitaPasoObservacionesService
  ) {}

  @Get(":visitaId/paso-observaciones")
  @ApiOperation({
    summary: "Lista observaciones y recomendaciones por paso de una visita."
  })
  @ApiParam({ name: "visitaId", type: String, example: "1" })
  @ApiOkResponse({ description: "Notas por paso encontradas." })
  @ApiNotFoundResponse({ description: "La visita no existe." })
  getByVisita(@Param("visitaId", ParseEntityIdPipe) visitaId: string) {
    return this.stepNotesService.findByVisitaId(visitaId);
  }

  @Get(":visitaId/paso-observaciones/:stepNumber")
  @ApiOperation({
    summary: "Obtiene observacion y recomendacion de un paso de la visita."
  })
  @ApiParam({ name: "visitaId", type: String, example: "1" })
  @ApiParam({ name: "stepNumber", type: Number, example: 2 })
  @ApiOkResponse({ description: "Nota encontrada." })
  @ApiNotFoundResponse({ description: "La visita o nota no existe." })
  getByStep(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string,
    @Param("stepNumber") stepNumber: string
  ) {
    return this.stepNotesService.findByVisitaIdAndStep(
      visitaId,
      Number(stepNumber)
    );
  }

  @Patch(":visitaId/paso-observaciones/:stepNumber")
  @ApiOperation({
    summary: "Crea o actualiza observacion y recomendacion de un paso."
  })
  @ApiParam({ name: "visitaId", type: String, example: "1" })
  @ApiParam({ name: "stepNumber", type: Number, example: 2 })
  @ApiOkResponse({ description: "Nota guardada." })
  @ApiBadRequestResponse({ description: "Datos invalidos." })
  upsert(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string,
    @Param("stepNumber") stepNumber: string,
    @Body() dto: UpsertVisitaPasoObservacionDto
  ) {
    return this.stepNotesService.upsert(visitaId, Number(stepNumber), dto);
  }
}
