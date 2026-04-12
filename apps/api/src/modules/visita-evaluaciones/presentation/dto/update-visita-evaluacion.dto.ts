import { PartialType } from "@nestjs/swagger";

import { CreateVisitaEvaluacionDto } from "./create-visita-evaluacion.dto";

export class UpdateVisitaEvaluacionDto extends PartialType(
  CreateVisitaEvaluacionDto
) {}
