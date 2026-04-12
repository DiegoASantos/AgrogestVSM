import { PartialType } from "@nestjs/swagger";

import { CreateVisitaProductoRecomendadoDto } from "./create-visita-producto-recomendado.dto";

export class UpdateVisitaProductoRecomendadoDto extends PartialType(
  CreateVisitaProductoRecomendadoDto
) {}
