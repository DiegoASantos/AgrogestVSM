import { OmitType, PartialType } from "@nestjs/swagger";

import { CreateVisitaCampoDto } from "./create-visita-campo.dto";

export class UpdateVisitaCampoDto extends PartialType(
  OmitType(CreateVisitaCampoDto, ["technicalScoreVersion"] as const)
) {}
