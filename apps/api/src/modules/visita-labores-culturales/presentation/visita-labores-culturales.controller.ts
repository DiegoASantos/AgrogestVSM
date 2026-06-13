import { Controller, Delete, Param } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { VisitaLaboresCulturalesService } from "../application/visita-labores-culturales.service";

@ApiTags("Labores culturales de visita")
@Controller("labores-culturales-visita")
export class VisitaLaboresCulturalesController {
  constructor(
    private readonly visitaLaboresCulturalesService: VisitaLaboresCulturalesService
  ) {}

  @Delete(":id")
  @ApiOperation({ summary: "Elimina una labor cultural de una visita." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Labor cultural de visita eliminada." })
  @ApiNotFoundResponse({ description: "La labor cultural de visita no existe." })
  deleteLabor(@Param("id", ParseEntityIdPipe) id: string) {
    return this.visitaLaboresCulturalesService.remove(id);
  }
}
