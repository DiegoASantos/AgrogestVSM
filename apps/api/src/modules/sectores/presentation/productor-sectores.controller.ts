import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { SectoresService } from "../application/sectores.service";

@ApiTags("Sectores")
@Controller("productores")
export class ProductorSectoresController {
  constructor(private readonly sectoresService: SectoresService) {}

  @Get(":productorId/sectores")
  @ApiOperation({
    summary: "Lista los sectores asociados a un productor."
  })
  @ApiParam({
    name: "productorId",
    type: String,
    example: "1"
  })
  @ApiOkResponse({
    description: "Lista de sectores del productor."
  })
  @ApiNotFoundResponse({
    description: "El productor no existe."
  })
  getSectoresByProductorId(
    @Param("productorId", ParseEntityIdPipe) productorId: string
  ) {
    return this.sectoresService.findByProductorId(productorId);
  }
}
