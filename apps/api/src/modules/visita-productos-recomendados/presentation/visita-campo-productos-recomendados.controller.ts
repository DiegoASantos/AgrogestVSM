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
import { VisitaProductosRecomendadosService } from "../application/visita-productos-recomendados.service";
import { CreateVisitaProductoRecomendadoDto } from "./dto/create-visita-producto-recomendado.dto";

@ApiTags("Productos Recomendados de Visita")
@Controller("visitas-campo")
export class VisitaCampoProductosRecomendadosController {
  constructor(
    private readonly productosRecomendadosService: VisitaProductosRecomendadosService
  ) {}

  @Post(":visitaId/productos-recomendados")
  @ApiOperation({
    summary: "Crea un producto recomendado asociado a una visita."
  })
  @ApiParam({
    name: "visitaId",
    type: String,
    example: "1"
  })
  @ApiCreatedResponse({
    description: "Producto recomendado creado."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o referencias inexistentes."
  })
  createProductoRecomendado(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string,
    @Body() createDto: CreateVisitaProductoRecomendadoDto
  ) {
    return this.productosRecomendadosService.create(visitaId, createDto);
  }

  @Get(":visitaId/productos-recomendados")
  @ApiOperation({
    summary: "Lista los productos recomendados de una visita."
  })
  @ApiParam({
    name: "visitaId",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Lista de productos recomendados."
  })
  @ApiNotFoundResponse({
    description: "La visita no existe."
  })
  getProductosRecomendadosByVisitaId(
    @Param("visitaId", ParseEntityIdPipe) visitaId: string
  ) {
    return this.productosRecomendadosService.findByVisitaId(visitaId);
  }
}
