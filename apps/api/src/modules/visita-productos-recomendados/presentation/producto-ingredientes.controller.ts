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
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ProductoIngredientesService } from "../application/producto-ingredientes.service";
import { CreateProductoIngredienteDto } from "./dto/create-producto-ingrediente.dto";
import { FindProductoIngredientesQueryDto } from "./dto/find-producto-ingredientes-query.dto";
import { UpdateProductoIngredienteDto } from "./dto/update-producto-ingrediente.dto";

@ApiTags("Producto Ingredientes")
@Controller("producto-ingredientes")
export class ProductoIngredientesController {
  constructor(
    private readonly productoIngredientesService: ProductoIngredientesService
  ) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Crea una relacion producto ingrediente." })
  @ApiCreatedResponse({
    description: "Relacion creada."
  })
  @ApiConflictResponse({
    description: "La relacion ya existe."
  })
  createProductoIngrediente(
    @Body() createProductoIngredienteDto: CreateProductoIngredienteDto
  ) {
    return this.productoIngredientesService.create(createProductoIngredienteDto);
  }

  @Get()
  @ApiOperation({
    summary: "Lista las relaciones producto ingrediente con filtros opcionales."
  })
  @ApiQuery({
    name: "producto_id",
    required: false,
    type: String
  })
  @ApiQuery({
    name: "ingrediente_activo_id",
    required: false,
    type: String
  })
  @ApiOkResponse({
    description: "Lista de relaciones producto ingrediente."
  })
  getProductoIngredientes(@Query() query: FindProductoIngredientesQueryDto) {
    return this.productoIngredientesService.findAll(query);
  }

  @Patch(":productId/:ingredientActiveId")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Actualiza una relacion producto ingrediente." })
  @ApiParam({
    name: "productId",
    type: String,
    example: "1"
  })
  @ApiParam({
    name: "ingredientActiveId",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Relacion actualizada."
  })
  @ApiConflictResponse({
    description: "La relacion destino ya existe."
  })
  @ApiNotFoundResponse({
    description: "La relacion no existe."
  })
  updateProductoIngrediente(
    @Param("productId", ParseEntityIdPipe) productId: string,
    @Param("ingredientActiveId", ParseEntityIdPipe) ingredientActiveId: string,
    @Body() updateProductoIngredienteDto: UpdateProductoIngredienteDto
  ) {
    return this.productoIngredientesService.update(
      productId,
      ingredientActiveId,
      updateProductoIngredienteDto
    );
  }

  @Delete(":productId/:ingredientActiveId")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Elimina una relacion producto ingrediente." })
  @ApiParam({
    name: "productId",
    type: String,
    example: "1"
  })
  @ApiParam({
    name: "ingredientActiveId",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Relacion eliminada."
  })
  @ApiNotFoundResponse({
    description: "La relacion no existe."
  })
  deleteProductoIngrediente(
    @Param("productId", ParseEntityIdPipe) productId: string,
    @Param("ingredientActiveId", ParseEntityIdPipe) ingredientActiveId: string
  ) {
    return this.productoIngredientesService.remove(productId, ingredientActiveId);
  }
}
