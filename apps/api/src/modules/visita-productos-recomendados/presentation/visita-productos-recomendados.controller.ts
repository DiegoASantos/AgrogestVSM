import { Body, Controller, Delete, Get, Param, Patch } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { VisitaProductosRecomendadosService } from "../application/visita-productos-recomendados.service";
import { UpdateVisitaProductoRecomendadoDto } from "./dto/update-visita-producto-recomendado.dto";

@ApiTags("Productos Recomendados de Visita")
@Controller("productos-recomendados-visita")
export class VisitaProductosRecomendadosController {
  constructor(
    private readonly productosRecomendadosService: VisitaProductosRecomendadosService
  ) {}

  @Get(":id")
  @ApiOperation({ summary: "Obtiene un producto recomendado por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Producto recomendado encontrado."
  })
  @ApiNotFoundResponse({
    description: "El producto recomendado no existe."
  })
  getProductoRecomendadoById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.productosRecomendadosService.findById(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Actualiza un producto recomendado." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Producto recomendado actualizado."
  })
  @ApiBadRequestResponse({
    description: "Datos invalidos o referencias inexistentes."
  })
  @ApiNotFoundResponse({
    description: "El producto recomendado no existe."
  })
  updateProductoRecomendado(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateDto: UpdateVisitaProductoRecomendadoDto
  ) {
    return this.productosRecomendadosService.update(id, updateDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Elimina un producto recomendado." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Producto recomendado eliminado."
  })
  @ApiNotFoundResponse({
    description: "El producto recomendado no existe."
  })
  deleteProductoRecomendado(@Param("id", ParseEntityIdPipe) id: string) {
    return this.productosRecomendadosService.remove(id);
  }
}
