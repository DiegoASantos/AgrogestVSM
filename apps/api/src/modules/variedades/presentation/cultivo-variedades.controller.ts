import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { VariedadesService } from "../application/variedades.service";

@ApiTags("Variedades")
@Controller("cultivos")
export class CultivoVariedadesController {
  constructor(private readonly variedadesService: VariedadesService) {}

  @Get(":cultivoId/variedades")
  @ApiOperation({
    summary: "Lista las variedades asociadas a un cultivo."
  })
  @ApiParam({
    name: "cultivoId",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Lista de variedades del cultivo."
  })
  getVariedadesByCultivoId(
    @Param("cultivoId", ParseEntityIdPipe) cultivoId: string
  ) {
    return this.variedadesService.findByCultivoId(cultivoId);
  }
}
