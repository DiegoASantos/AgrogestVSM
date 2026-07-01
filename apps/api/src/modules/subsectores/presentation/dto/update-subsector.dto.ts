import { PartialType } from "@nestjs/swagger";

import { CreateSubsectorDto } from "./create-subsector.dto";

export class UpdateSubsectorDto extends PartialType(CreateSubsectorDto) {}
