import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { VisitasCampoService } from "../application/visitas-campo.service";
import { CreateVisitaCampoDto } from "./dto/create-visita-campo.dto";
import { FindVisitasCampoQueryDto } from "./dto/find-visitas-campo-query.dto";
import { UpdateVisitaCampoDto } from "./dto/update-visita-campo.dto";

@ApiTags("Visitas de Campo")
@Controller("visitas-campo")
export class VisitasCampoController {
  constructor(private readonly visitasCampoService: VisitasCampoService) {}

  @Post()
  @ApiOperation({ summary: "Crea la cabecera de una visita de campo." })
  @ApiCreatedResponse({
    description: "Visita de campo creada."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o referencias inexistentes."
  })
  @ApiConflictResponse({
    description: "Ya existe una visita con el mismo nroFicha."
  })
  createVisitaCampo(@Body() createVisitaCampoDto: CreateVisitaCampoDto) {
    return this.visitasCampoService.create(createVisitaCampoDto);
  }

  @Get()
  @ApiOperation({
    summary: "Lista visitas de campo con filtros opcionales."
  })
  @ApiQuery({
    name: "productor_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "parcela_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "campania_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "agronomo_usuario_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "fecha_desde",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "fecha_hasta",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "activo",
    required: false,
    type: Boolean
  })
  @ApiOkResponse({
    description: "Lista de visitas de campo."
  })
  getVisitasCampo(@Query() query: FindVisitasCampoQueryDto) {
    return this.visitasCampoService.findAll(query);
  }

  @Get("mapa")
  @ApiOperation({
    summary:
      "Devuelve un FeatureCollection GeoJSON con las ubicaciones disponibles de las visitas de campo."
  })
  @ApiQuery({
    name: "productor_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "parcela_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "campania_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "agronomo_usuario_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "fecha_desde",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "fecha_hasta",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "activo",
    required: false,
    type: Boolean
  })
  @ApiOkResponse({
    description: "FeatureCollection GeoJSON con features Point para visitas."
  })
  getVisitasCampoMap(@Query() query: FindVisitasCampoQueryDto) {
    return this.visitasCampoService.findMap(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene una visita de campo por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Visita de campo encontrada."
  })
  @ApiNotFoundResponse({
    description: "La visita de campo no existe."
  })
  getVisitaCampoById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.visitasCampoService.findById(id);
  }

  @Get(":id/detalle-completo")
  @ApiOperation({
    summary: "Obtiene el detalle completo de una visita de campo."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description:
      "Cabecera de la visita con evaluaciones y observaciones sanitarias."
  })
  @ApiNotFoundResponse({
    description: "La visita de campo no existe."
  })
  getVisitaCampoFullDetail(@Param("id", ParseEntityIdPipe) id: string) {
    return this.visitasCampoService.getFullDetail(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualiza la cabecera de una visita de campo." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Visita de campo actualizada."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o referencias inexistentes."
  })
  @ApiConflictResponse({
    description: "Ya existe una visita con el mismo nroFicha."
  })
  @ApiNotFoundResponse({
    description: "La visita de campo no existe."
  })
  updateVisitaCampo(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateVisitaCampoDto: UpdateVisitaCampoDto
  ) {
    return this.visitasCampoService.update(id, updateVisitaCampoDto);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Desactiva logicamente una visita de campo."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Visita de campo desactivada."
  })
  @ApiNotFoundResponse({
    description: "La visita de campo no existe."
  })
  deleteVisitaCampo(@Param("id", ParseEntityIdPipe) id: string) {
    return this.visitasCampoService.remove(id);
  }
}
