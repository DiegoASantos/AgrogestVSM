import { PartialType } from "@nestjs/swagger";

import { CreateVisitaObservacionSanitariaDto } from "./create-visita-observacion-sanitaria.dto";

export class UpdateVisitaObservacionSanitariaDto extends PartialType(
  CreateVisitaObservacionSanitariaDto
) {}
