import { Controller, Get, Param } from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags
} from "@nestjs/swagger";

import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { MobileClimaService } from "../application/mobile-clima.service";

@ApiTags("Clima móvil")
@Roles("AGRONOMO", "ADMIN")
@Controller("mobile/clima")
export class MobileClimaController {
  constructor(private readonly mobileClimaService: MobileClimaService) {}

  @Get(":districtCode")
  @ApiOperation({ summary: "Obtiene clima territorial general para Inicio móvil." })
  @ApiParam({
    name: "districtCode",
    enum: ["tambogrande", "las-lomas", "motupe", "casma"]
  })
  @ApiOkResponse({
    description: "Estimación general y pronóstico de siete días, sin datos de predios."
  })
  @ApiForbiddenResponse({
    description: "Solo AGRONOMO y ADMIN pueden consultar el clima móvil."
  })
  @ApiNotFoundResponse({ description: "Distrito climático no disponible." })
  @ApiServiceUnavailableResponse({
    description: "El proveedor climático no está disponible."
  })
  getDistrictClimate(@Param("districtCode") districtCode: string) {
    return this.mobileClimaService.getByDistrict(districtCode);
  }
}
