import { PartialType } from "@nestjs/swagger";

import { CreateSubEtapaDto } from "./create-sub-etapa.dto";

export class UpdateSubEtapaDto extends PartialType(CreateSubEtapaDto) {}
