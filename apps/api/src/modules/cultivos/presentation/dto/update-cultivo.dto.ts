import { PartialType } from "@nestjs/swagger";

import { CreateCultivoDto } from "./create-cultivo.dto";

export class UpdateCultivoDto extends PartialType(CreateCultivoDto) {}
