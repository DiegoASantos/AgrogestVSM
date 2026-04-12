import { PartialType } from "@nestjs/swagger";

import { CreateProductoIngredienteDto } from "./create-producto-ingrediente.dto";

export class UpdateProductoIngredienteDto extends PartialType(
  CreateProductoIngredienteDto
) {}
