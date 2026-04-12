import { PartialType } from "@nestjs/swagger";

import { CreateVisitaRecomendacionDto } from "./create-visita-recomendacion.dto";

export class UpdateVisitaRecomendacionDto extends PartialType(
  CreateVisitaRecomendacionDto
) {}
