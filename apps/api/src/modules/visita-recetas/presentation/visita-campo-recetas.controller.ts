import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { VisitaRecetasService } from "../application/visita-recetas.service";
import { VisitaRecetasConsolidacionService } from "../application/visita-recetas-consolidacion.service";
import { CreateVisitaRecetaDto } from "./dto/create-visita-receta.dto";

@ApiTags("Recetas de visita")
@Controller("visitas-campo")
export class VisitaCampoRecetasController {
  constructor(
    private readonly recetasService: VisitaRecetasService,
    private readonly consolidacionService: VisitaRecetasConsolidacionService
  ) {}

  @Post(":visitaId/receta")
  @ApiOperation({ summary: "Crea o actualiza la receta de una visita." })
  @ApiParam({ name: "visitaId", type: String, example: "1" })
  @ApiCreatedResponse({ description: "Receta guardada." })
  @ApiBadRequestResponse({ description: "Datos invalidos o visita inexistente." })
  saveReceta(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string,
    @Body() dto: CreateVisitaRecetaDto
  ) {
    return this.recetasService.save(visitaId, dto);
  }

  @Get(":visitaId/receta")
  @ApiOperation({ summary: "Obtiene la receta de una visita." })
  @ApiParam({ name: "visitaId", type: String, example: "1" })
  @ApiOkResponse({ description: "Receta de la visita." })
  @ApiNotFoundResponse({ description: "La visita no existe." })
  getRecetaByVisitaId(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string
  ) {
    return this.recetasService.findByVisitaId(visitaId);
  }

  @Get(":visitaId/receta/consolidacion")
  @ApiOperation({ summary: "Obtiene los hallazgos consolidados de los pasos 2-5." })
  @ApiParam({ name: "visitaId", type: String, example: "1" })
  @ApiOkResponse({ description: "Hallazgos consolidados." })
  getConsolidacion(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string
  ) {
    return this.consolidacionService.getConsolidacion(visitaId);
  }

  @Get(":visitaId/receta/historial")
  @ApiOperation({ summary: "Obtiene el historial de versiones de la receta." })
  @ApiParam({ name: "visitaId", type: String, example: "1" })
  @ApiOkResponse({ description: "Historial de versiones." })
  getHistorial(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string
  ) {
    return this.recetasService.getHistorial(visitaId);
  }
}
