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
import { FindProductorCalificacionQueryDto } from "./dto/find-productor-calificacion-query.dto";

@ApiTags("Calificacion de productor")
@Controller("productores")
export class ProductorCalificacionController {
  constructor(
    private readonly calificacionesService: VisitaCalificacionesService
  ) {}

  @Get(":productorId/calificacion")
  @ApiOperation({ summary: "Obtiene el score de cumplimiento de un productor." })
  @ApiParam({ name: "productorId", type: String, example: "1" })
  @ApiQuery({ name: "campania_id", required: false, type: String })
  @ApiOkResponse({ description: "Score general, por modulo y por campania." })
  @ApiNotFoundResponse({ description: "El productor no existe." })
  getProductorCalificacion(
    @Param("productorId", ParseEntityIdPipe) productorId: string,
    @Query() query: FindProductorCalificacionQueryDto
  ) {
    return this.calificacionesService.getProductorScore(productorId, {
      campaniaId: query.campania_id ?? null
    });
  }
}
