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
import { ProductoresService } from "../application/productores.service";
import { CreateProductorDto } from "./dto/create-productor.dto";
import { UpdateProductorDto } from "./dto/update-productor.dto";
import { FindHistorialVisitasProductorQueryDto } from "../../visitas-campo/presentation/dto/find-historial-visitas-productor-query.dto";

@ApiTags("Productores")
@Controller("productores")
export class ProductoresController {
  constructor(private readonly productoresService: ProductoresService) {}

  @Post()
  @ApiOperation({ summary: "Crea un productor." })
  @ApiCreatedResponse({
    description: "Productor creado."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o tipo de documento inexistente."
  })
  @ApiConflictResponse({
    description: "Ya existe un productor con el mismo documento."
  })
  createProductor(@Body() createProductorDto: CreateProductorDto) {
    return this.productoresService.create(createProductorDto);
  }

  @Get()
  @ApiOperation({ summary: "Lista los productores con paginacion." })
  @ApiOkResponse({
    description: "Lista de productores paginada."
  })
  getProductores(@Query() pagination: PaginationQueryDto) {
    return this.productoresService.findAll(pagination);
  }

  @Get(":id/resumen")
  @ApiOperation({
    summary: "Devuelve un resumen del productor con conteo de sectores y parcelas."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Resumen del productor."
  })
  @ApiNotFoundResponse({
    description: "El productor no existe."
  })
  getProductorSummary(@Param("id", ParseEntityIdPipe) id: string) {
    return this.productoresService.getSummary(id);
  }

  @Get(":id/estructura")
  @ApiOperation({
    summary: "Devuelve la estructura del productor con sectores y parcelas."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Estructura del productor."
  })
  @ApiNotFoundResponse({
    description: "El productor no existe."
  })
  getProductorStructure(@Param("id", ParseEntityIdPipe) id: string) {
    return this.productoresService.getStructure(id);
  }

  @Get(":id/historial-visitas")
  @ApiOperation({
    summary: "Devuelve el historial de visitas de un productor."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
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
  @ApiOkResponse({
    description: "Historial de visitas del productor."
  })
  @ApiNotFoundResponse({
    description: "El productor no existe."
  })
  getProductorVisitHistory(
    @Param("id", ParseEntityIdPipe) id: string,
    @Query() query: FindHistorialVisitasProductorQueryDto
  ) {
    return this.productoresService.getHistorialVisitas(id, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene un productor por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Productor encontrado."
  })
  @ApiNotFoundResponse({
    description: "El productor no existe."
  })
  getProductorById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.productoresService.findById(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualiza un productor." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Productor actualizado."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o tipo de documento inexistente."
  })
  @ApiConflictResponse({
    description: "Ya existe un productor con el mismo documento."
  })
  @ApiNotFoundResponse({
    description: "El productor no existe."
  })
  updateProductor(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateProductorDto: UpdateProductorDto
  ) {
    return this.productoresService.update(id, updateProductorDto);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Desactiva logicamente un productor."
  })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Productor desactivado."
  })
  @ApiNotFoundResponse({
    description: "El productor no existe."
  })
  deleteProductor(@Param("id", ParseEntityIdPipe) id: string) {
    return this.productoresService.remove(id);
  }
}
