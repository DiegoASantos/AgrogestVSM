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
import { VisitaLaboresCulturalesService } from "../application/visita-labores-culturales.service";
import { CreateVisitaLaborCulturalDto } from "./dto/create-visita-labor-cultural.dto";

@ApiTags("Labores culturales de visita")
@Controller("visitas-campo")
export class VisitaCampoLaboresCulturalesController {
  constructor(
    private readonly visitaLaboresCulturalesService: VisitaLaboresCulturalesService
  ) {}

  @Post(":visitaId/labores-culturales")
  @ApiOperation({ summary: "Crea una labor cultural asociada a una visita." })
  @ApiParam({ name: "visitaId", type: String, example: "1" })
  @ApiCreatedResponse({ description: "Labor cultural de visita creada." })
  @ApiBadRequestResponse({ description: "Datos invalidos o visita inexistente." })
  @ApiConflictResponse({ description: "La labor ya existe para la visita." })
  createLabor(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string,
    @Body() createDto: CreateVisitaLaborCulturalDto
  ) {
    return this.visitaLaboresCulturalesService.create(visitaId, createDto);
  }

  @Get(":visitaId/labores-culturales")
  @ApiOperation({ summary: "Lista las labores culturales de una visita." })
  @ApiParam({ name: "visitaId", type: String, example: "1" })
  @ApiOkResponse({ description: "Lista de labores culturales de la visita." })
  @ApiNotFoundResponse({ description: "La visita no existe." })
  getLaboresByVisitaId(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string
  ) {
    return this.visitaLaboresCulturalesService.findByVisitaId(visitaId);
  }
}
