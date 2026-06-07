import { PartialType } from "@nestjs/swagger";

import { CreatePlagaEnfermedadEtapaNivelDto } from "./create-plaga-enfermedad-etapa-nivel.dto";

export class UpdatePlagaEnfermedadEtapaNivelDto extends PartialType(
  CreatePlagaEnfermedadEtapaNivelDto
) {}
