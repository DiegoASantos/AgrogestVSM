import { PartialType } from "@nestjs/swagger";

import { CreateEtapaFenologicaDto } from "./create-etapa-fenologica.dto";

export class UpdateEtapaFenologicaDto extends PartialType(
  CreateEtapaFenologicaDto
) {}
