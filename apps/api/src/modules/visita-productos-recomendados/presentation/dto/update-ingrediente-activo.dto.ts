import { PartialType } from "@nestjs/swagger";

import { CreateIngredienteActivoDto } from "./create-ingrediente-activo.dto";

export class UpdateIngredienteActivoDto extends PartialType(
  CreateIngredienteActivoDto
) {}
