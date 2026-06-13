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
import { VisitaRiegosService } from "../application/visita-riegos.service";
import { CreateVisitaRiegoDto } from "./dto/create-visita-riego.dto";

@ApiTags("Riegos de visita")
@Controller("visitas-campo")
export class VisitaCampoRiegosController {
  constructor(private readonly visitaRiegosService: VisitaRiegosService) {}

  @Post(":visitaId/riego")
  @ApiOperation({ summary: "Crea el riego asociado a una visita." })
  @ApiParam({ name: "visitaId", type: String, example: "1" })
  @ApiCreatedResponse({ description: "Riego creado." })
  @ApiBadRequestResponse({ description: "Datos invalidos o visita inexistente." })
  @ApiConflictResponse({ description: "La visita ya tiene riego registrado." })
  createRiego(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string,
    @Body() createDto: CreateVisitaRiegoDto
  ) {
    return this.visitaRiegosService.create(visitaId, createDto);
  }

  @Get(":visitaId/riego")
  @ApiOperation({ summary: "Obtiene el riego de una visita." })
  @ApiParam({ name: "visitaId", type: String, example: "1" })
  @ApiOkResponse({ description: "Riego de la visita." })
  @ApiNotFoundResponse({ description: "La visita no existe." })
  getRiegoByVisitaId(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string
  ) {
    return this.visitaRiegosService.findByVisitaId(visitaId);
  }
}
