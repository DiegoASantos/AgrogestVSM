import { Controller, Get, Param } from "@nestjs/common";
import { ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";

import { ParseEntityIdPipe } from "../../../common/pipes/parse-entity-id.pipe";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { ParcelaClimaService } from "../application/parcela-clima.service";

@ApiTags("Parcelas")
@Controller("parcelas")
export class ParcelaClimaController {
  constructor(private readonly parcelaClimaService: ParcelaClimaService) {}

  @Get(":id/clima")
  @ApiOperation({ summary: "Obtiene clima estimado para una parcela autorizada." })
  @ApiParam({ name: "id", type: String, example: "1" })
  @ApiOkResponse({ description: "Estimación climática actual y pronóstico de siete días." })
  @ApiBadRequestResponse({ description: "La parcela no tiene georreferencia utilizable." })
  @ApiNotFoundResponse({ description: "La parcela no existe o no está disponible para el usuario." })
  @ApiServiceUnavailableResponse({ description: "El proveedor climático no está disponible." })
  getParcelaClimate(
    @Param("id", ParseEntityIdPipe) id: string,
    @CurrentAuthUser() currentUser: AccessTokenPayload
  ) {
    return this.parcelaClimaService.getByParcelaId(id, currentUser);
  }
}
