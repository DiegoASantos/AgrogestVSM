import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { VisitaCalificacionesService } from "../application/visita-calificaciones.service";
import { FindRecetaAnteriorQueryDto } from "./dto/find-receta-anterior-query.dto";

@ApiTags("Receta anterior")
@Controller("parcelas")
export class ParcelaRecetaAnteriorController {
  constructor(
    private readonly calificacionesService: VisitaCalificacionesService
  ) {}

  @Get(":parcelaId/visita-anterior-receta")
  @ApiOperation({
    summary: "Obtiene la receta de la visita anterior calificable de una parcela."
  })
  @ApiParam({ name: "parcelaId", type: String, example: "1" })
  @ApiQuery({ name: "excluirVisitaId", required: false, type: String })
  @ApiOkResponse({ description: "Receta anterior o indicador de ausencia." })
  @ApiNotFoundResponse({ description: "La parcela no existe." })
  getPreviousRecipe(
    @Param("parcelaId", ParseEntityIdPipe) parcelaId: string,
    @Query() query: FindRecetaAnteriorQueryDto
  ) {
    return this.calificacionesService.findPreviousRecipe(parcelaId, {
      excluirVisitaId: query.excluirVisitaId ?? null
    });
  }
}
