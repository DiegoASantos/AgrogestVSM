import { PartialType } from "@nestjs/swagger";

import { CreateVisitaCampoDto } from "./create-visita-campo.dto";

export class UpdateVisitaCampoDto extends PartialType(CreateVisitaCampoDto) {}
