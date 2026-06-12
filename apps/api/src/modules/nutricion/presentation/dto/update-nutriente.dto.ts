import { PartialType } from "@nestjs/swagger";

import { CreateNutrienteDto } from "./create-nutriente.dto";

export class UpdateNutrienteDto extends PartialType(CreateNutrienteDto) {}
