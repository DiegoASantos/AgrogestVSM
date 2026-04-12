import { PartialType } from "@nestjs/swagger";

import { CreateCampaniaDto } from "./create-campania.dto";

export class UpdateCampaniaDto extends PartialType(CreateCampaniaDto) {}
