import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
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
    @Param("sectorId", ParseEntityIdPipe) sectorId: string,
    @CurrentAuthUser() currentUser?: AccessTokenPayload
  ) {
    return this.parcelasService.findBySectorId(sectorId, currentUser);
  }
}
