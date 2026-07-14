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

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { ParcelasService } from "../application/parcelas.service";
import { CreateParcelaDto } from "./dto/create-parcela.dto";
import { FindParcelasQueryDto } from "./dto/find-parcelas-query.dto";
import { FindParcelasSummaryQueryDto } from "./dto/find-parcelas-summary-query.dto";
import { UpdateParcelaAgronomoDto } from "./dto/update-parcela-agronomo.dto";
import { UpdateParcelaDto } from "./dto/update-parcela.dto";

@ApiTags("Parcelas")
@Controller("parcelas")
export class ParcelasController {
  constructor(private readonly parcelasService: ParcelasService) {}

  @Post()
  @ApiOperation({ summary: "Crea una parcela." })
  @ApiCreatedResponse({
    description: "Parcela creada."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o subsector inexistente."
  })
  @ApiConflictResponse({
    description:
      "Ya existe una parcela con el mismo codigo o nombre para el productor y subsector."
  })
  createParcela(@Body() createParcelaDto: CreateParcelaDto) {
    return this.parcelasService.create(createParcelaDto);
  }

  @Get()
  @ApiOperation({
    summary: "Lista parcelas con filtros opcionales por sector, subsector y estado."
  })
  @ApiQuery({
    name: "sector_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "subsector_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "activo",
    required: false,
    type: Boolean
  })
  @ApiOkResponse({
    description: "Lista de parcelas."
  })
  getParcelas(
    @Query() query: FindParcelasQueryDto,
    @CurrentAuthUser() currentUser?: AccessTokenPayload
  ) {
    return this.parcelasService.findAll(query, currentUser);
  }

  @Get("mapa")
  @ApiOperation({
    summary:
      "Devuelve un FeatureCollection GeoJSON con las geometrias disponibles de las parcelas."
  })
  @ApiQuery({
    name: "sector_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "subsector_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "productor_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "activo",
    required: false,
    type: Boolean
  })
  @ApiOkResponse({
    description:
      "FeatureCollection GeoJSON con features MultiPolygon y Point para parcelas."
  })
  getParcelasMap(
    @Query() query: FindParcelasSummaryQueryDto,
    @CurrentAuthUser() currentUser?: AccessTokenPayload
  ) {
    return this.parcelasService.findMap(query, currentUser);
  }

  @Get("resumen")
  @ApiOperation({
    summary: "Devuelve un resumen agregado de parcelas."
  })
  @ApiQuery({
    name: "sector_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "subsector_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "productor_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "activo",
    required: false,
    type: Boolean
  })
  @ApiOkResponse({
    description: "Resumen agregado de parcelas."
  })
  getParcelasSummary(@Query() query: FindParcelasSummaryQueryDto) {
    return this.parcelasService.getSummary(query);
  }

  @Get(":id/historial-visitas")
  @ApiOperation({
    summary: "Devuelve el historial de visitas de una parcela."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Historial de visitas de la parcela."
  })
  @ApiNotFoundResponse({
    description: "La parcela no existe."
  })
  getParcelaVisitHistory(
    @Param("id", ParseEntityIdPipe) id: string,
    @Query() pagination: PaginationQueryDto
  ) {
    return this.parcelasService.getHistorialVisitas(id, pagination);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene una parcela por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Parcela encontrada."
  })
  @ApiNotFoundResponse({
    description: "La parcela no existe."
  })
  getParcelaById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.parcelasService.findById(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualiza una parcela." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Parcela actualizada."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o subsector inexistente."
  })
  @ApiConflictResponse({
    description:
      "Ya existe una parcela con el mismo codigo o nombre para el productor y subsector."
  })
  @ApiNotFoundResponse({
    description: "La parcela no existe."
  })
  updateParcela(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateParcelaDto: UpdateParcelaDto
  ) {
    return this.parcelasService.update(id, updateParcelaDto);
  }

  @Patch(":id/agronomo")
  @ApiOperation({ summary: "Asigna o desasigna un agronomo a una parcela." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Agronomo asignado o desasignado correctamente."
  })
  @ApiBadRequestResponse({
    description:
      "El usuario especificado no existe, no esta activo o no tiene rol AGRONOMO."
  })
  @ApiNotFoundResponse({
    description: "La parcela no existe."
  })
  updateParcelaAgronomo(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateParcelaAgronomoDto: UpdateParcelaAgronomoDto
  ) {
    return this.parcelasService.updateAgronomo(id, updateParcelaAgronomoDto);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Desactiva logicamente una parcela."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Parcela desactivada."
  })
  @ApiNotFoundResponse({
    description: "La parcela no existe."
  })
  deleteParcela(@Param("id", ParseEntityIdPipe) id: string) {
    return this.parcelasService.remove(id);
  }
}
