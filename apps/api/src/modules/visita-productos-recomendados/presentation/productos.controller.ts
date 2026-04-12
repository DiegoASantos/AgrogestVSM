import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post
} from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ProductosService } from "../application/productos.service";
import { CreateProductoDto } from "./dto/create-producto.dto";
import { UpdateProductoDto } from "./dto/update-producto.dto";

@ApiTags("Productos")
@Controller("productos")
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @Roles("ADMIN")
  @ApiOperation({ summary: "Crea un producto." })
  @ApiCreatedResponse({
    description: "Producto creado."
  })
  @ApiConflictResponse({
    description: "Ya existe un producto con el mismo nombre."
  })
  createProducto(@Body() createProductoDto: CreateProductoDto) {
    return this.productosService.create(createProductoDto);
  }

  @Get()
  @ApiOperation({ summary: "Lista los productos." })
  @ApiOkResponse({
    description: "Lista de productos."
  })
  getProducts() {
    return this.productosService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtiene un producto por id." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Producto encontrado."
  })
  @ApiNotFoundResponse({
    description: "El producto no existe."
  })
  getProductById(@Param("id", ParseEntityIdPipe) id: string) {
    return this.productosService.findById(id);
  }

  @Patch(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Actualiza un producto." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Producto actualizado."
  })
  @ApiConflictResponse({
    description: "Ya existe un producto con el mismo nombre."
  })
  @ApiNotFoundResponse({
    description: "El producto no existe."
  })
  updateProduct(
    @Param("id", ParseEntityIdPipe) id: string,
    @Body() updateProductoDto: UpdateProductoDto
  ) {
    return this.productosService.update(id, updateProductoDto);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Desactiva logicamente un producto." })
  @ApiParam({
    name: "id",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Producto desactivado."
  })
  @ApiNotFoundResponse({
    description: "El producto no existe."
  })
  deleteProduct(@Param("id", ParseEntityIdPipe) id: string) {
    return this.productosService.remove(id);
  }
}
