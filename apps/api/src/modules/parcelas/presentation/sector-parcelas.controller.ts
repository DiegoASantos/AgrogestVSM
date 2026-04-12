import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { ParcelasService } from "../application/parcelas.service";

@ApiTags("Parcelas")
@Controller("sectores")
export class SectorParcelasController {
  constructor(private readonly parcelasService: ParcelasService) {}

  @Get(":sectorId/parcelas")
  @ApiOperation({
    summary: "Lista las parcelas asociadas a un sector."
  })
  @ApiParam({
    name: "sectorId",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Lista de parcelas del sector."
  })
  @ApiNotFoundResponse({
    description: "El sector no existe."
  })
  getParcelasBySectorId(
    @Param("sectorId", ParseEntityIdPipe) sectorId: string
  ) {
    return this.parcelasService.findBySectorId(sectorId);
  }
}
