import { Controller, Get, Param } from "@nestjs/common";
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { SubsectoresService } from "../application/subsectores.service";

@ApiTags("Subsectores")
@Controller("sectores")
export class SectorSubsectoresController {
  constructor(private readonly subsectoresService: SubsectoresService) {}

  @Get(":sectorId/subsectores")
  @ApiOperation({ summary: "Lista subsectores de un sector." })
  @ApiParam({
    name: "sectorId",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Lista de subsectores del sector."
  })
  @ApiNotFoundResponse({
    description: "El sector no existe."
  })
  getSubsectoresBySectorId(
    @Param("sectorId", ParseEntityIdPipe) sectorId: string
  ) {
    return this.subsectoresService.findBySectorId(sectorId);
  }
}
