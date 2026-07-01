import { Controller, Get, Param } from "@nestjs/common";
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { SubsectoresService } from "../application/subsectores.service";

@ApiTags("Subsectores")
@Controller("productores")
export class ProductorSectorSubsectoresController {
  constructor(private readonly subsectoresService: SubsectoresService) {}

  @Get(":productorId/sectores/:sectorId/subsectores")
  @ApiOperation({
    summary: "Lista subsectores de un sector usados por un productor."
  })
  @ApiParam({
    name: "productorId",
    type: String,
    example: "1"
  })
  @ApiParam({
    name: "sectorId",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Lista de subsectores filtrados por productor y sector."
  })
  @ApiNotFoundResponse({
    description: "El productor o sector no existe."
  })
  getSubsectoresByProductorAndSector(
    @Param("productorId", ParseEntityIdPipe) productorId: string,
    @Param("sectorId", ParseEntityIdPipe) sectorId: string
  ) {
    return this.subsectoresService.findByProductorAndSector(productorId, sectorId);
  }
}
