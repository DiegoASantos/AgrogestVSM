import { PartialType } from "@nestjs/swagger";

import { CreateVisitaRiegoDto } from "./create-visita-riego.dto";

export class UpdateVisitaRiegoDto extends PartialType(CreateVisitaRiegoDto) {}
