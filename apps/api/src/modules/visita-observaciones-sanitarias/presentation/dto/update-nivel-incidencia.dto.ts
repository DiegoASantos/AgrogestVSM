import { PartialType } from "@nestjs/swagger";

import { CreateNivelIncidenciaDto } from "./create-nivel-incidencia.dto";

export class UpdateNivelIncidenciaDto extends PartialType(
  CreateNivelIncidenciaDto
) {}
