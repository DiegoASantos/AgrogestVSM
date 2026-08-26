import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags
} from "@nestjs/swagger";
import type { FastifyReply } from "fastify";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { VisitasCampoService } from "../application/visitas-campo.service";
import { CreateVisitaCampoDto } from "./dto/create-visita-campo.dto";
import { ExportVisitasExcelQueryDto } from "./dto/export-visitas-excel-query.dto";
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
  createVisitaCampo(
    @Body() createVisitaCampoDto: CreateVisitaCampoDto,
    @CurrentAuthUser() currentUser?: AccessTokenPayload
  ) {
    return this.visitasCampoService.create(createVisitaCampoDto, currentUser);
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

  @Get("reporte-excel")
  @ApiOperation({ summary: "Exporta visitas activas a Excel por rango y agrónomo." })
  @ApiProduces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  @ApiOkResponse({ description: "Archivo Excel de visitas." })
  @ApiBadRequestResponse({ description: "Rango de fechas inválido." })
  async exportVisitasExcel(
    @Query() query: ExportVisitasExcelQueryDto,
    @Res() reply: FastifyReply,
    @CurrentAuthUser() currentUser?: AccessTokenPayload
  ) {
    const report = await this.visitasCampoService.exportExcelReport(query, currentUser);

    return reply
      .header(
        "Content-Disposition",
        `attachment; filename="${report.fileName}"`
      )
      .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .send(report.content);
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
    description: "Cabecera de la visita con evaluaciones y observaciones sanitarias."
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
    @Body() updateVisitaCampoDto: UpdateVisitaCampoDto,
    @CurrentAuthUser() currentUser?: AccessTokenPayload
  ) {
    return this.visitasCampoService.update(id, updateVisitaCampoDto, currentUser);
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
  @ApiForbiddenResponse({
    description: "El usuario no tiene permiso para eliminar visitas."
  })
  deleteVisitaCampo(
    @Param("id", ParseEntityIdPipe) id: string,
    @CurrentAuthUser() currentUser?: AccessTokenPayload
  ) {
    return this.visitasCampoService.remove(id, currentUser);
  }
}
