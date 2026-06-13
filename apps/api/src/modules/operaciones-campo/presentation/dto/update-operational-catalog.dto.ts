import { PartialType } from "@nestjs/swagger";

import { CreateOperationalCatalogDto } from "./create-operational-catalog.dto";

export class UpdateOperationalCatalogDto extends PartialType(
  CreateOperationalCatalogDto
) {}
