import { PartialType } from "@nestjs/swagger";

import { CreatePlagaEnfermedadDto } from "./create-plaga-enfermedad.dto";

export class UpdatePlagaEnfermedadDto extends PartialType(
  CreatePlagaEnfermedadDto
) {}
