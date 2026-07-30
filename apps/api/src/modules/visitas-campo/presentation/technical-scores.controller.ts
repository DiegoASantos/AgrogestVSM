import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { TechnicalScoresService } from "../application/technical-scores.service";

@ApiTags("Scores técnicos")
@Controller()
export class TechnicalScoresController {
  constructor(private readonly scores: TechnicalScoresService) {}

  @Get("visitas-campo/:visitaId/scores-tecnicos")
  @ApiOperation({ summary: "Obtiene los scores técnicos independientes de una visita." })
  byVisit(@Param("visitaId", ParseEntityIdPipe) visitaId: string) { return this.scores.byVisit(visitaId); }

  @Get("productores/:productorId/scores-tecnicos")
  @ApiQuery({ name: "campania_id", required: false, type: String })
  @ApiOperation({ summary: "Obtiene los scores técnicos agregados de un productor." })
  byProductor(@Param("productorId", ParseEntityIdPipe) productorId: string, @Query("campania_id") campaniaId?: string) {
    return this.scores.byProductor(productorId, campaniaId);
  }
}
