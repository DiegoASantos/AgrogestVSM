import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { ScoreSanitarioPlagasService } from "../application/score-sanitario-plagas.service";

@ApiTags("Score sanitario")
@Controller()
export class ScoreSanitarioPlagasController {
  constructor(private readonly scores: ScoreSanitarioPlagasService) {}

  @Get("visitas-campo/:visitaId/score-sanitario-plagas")
  @ApiOperation({ summary: "Obtiene el score sanitario de Plagas de una visita." })
  byVisit(@Param("visitaId", ParseEntityIdPipe) visitaId: string) {
    return this.scores.byVisit(visitaId);
  }

  @Get("productores/:productorId/score-sanitario-plagas")
  @ApiQuery({ name: "campania_id", required: false, type: String })
  @ApiOperation({ summary: "Obtiene el score sanitario de Plagas del productor." })
  byProductor(
    @Param("productorId", ParseEntityIdPipe) productorId: string,
    @Query("campania_id") campaniaId?: string
  ) {
    return this.scores.byProductor(productorId, campaniaId);
  }
}
