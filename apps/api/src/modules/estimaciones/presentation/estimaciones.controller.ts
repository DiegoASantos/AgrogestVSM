import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";

import { createSuccessResponse } from "../../../common/http/api-response";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { AllowAnalystMutation } from "../../auth/presentation/decorators/allow-analyst-mutation.decorator";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { EstimacionesService } from "../application/estimaciones.service";
import { EstimationWeekParamDto } from "./dto/estimation-week-param.dto";
import { SaveWeekEstimatesDto } from "./dto/save-week-estimates.dto";
import { SaveWeekPricesDto } from "./dto/save-week-prices.dto";

@ApiTags("Estimaciones")
@Roles("ADMIN", "ANALISTA")
@Controller("estimaciones")
export class EstimacionesController {
  constructor(private readonly estimacionesService: EstimacionesService) {}

  @Get("semanas/:fecha/precios")
  @ApiOperation({ summary: "Consulta el rango semanal de precio en soles por jaba." })
  @ApiOkResponse({ description: "Semana normalizada y priceRange con importes y auditoría, o null si no hay estimación." })
  @ApiBadRequestResponse({ description: "Fecha inválida; se requiere YYYY-MM-DD." })
  getWeekPrices(@Param() params: EstimationWeekParamDto) {
    return this.estimacionesService.getWeekPrices(params.fecha).then(createSuccessResponse);
  }

  @Put("semanas/:fecha/precios")
  @AllowAnalystMutation()
  @ApiOperation({ summary: "Guarda o retira el rango semanal de precios por jaba." })
  @ApiOkResponse({ description: "Semana y rango actualizado; ambos null retiran el rango." })
  @ApiBadRequestResponse({ description: "Fecha o rango inválido; mínimo y máximo deben enviarse juntos." })
  @ApiForbiddenResponse({ description: "Solo ADMIN y ANALISTA pueden editar precios." })
  async saveWeekPrices(
    @Param() params: EstimationWeekParamDto,
    @Body() body: SaveWeekPricesDto,
    @CurrentAuthUser() currentUser: AccessTokenPayload
  ) {
    return createSuccessResponse(await this.estimacionesService.saveWeekPrices(params.fecha, body, currentUser.userId));
  }

  @Get("semanas/:fecha")
  @ApiOperation({
    summary: "Compara estimaciones y visitas reales de una semana."
  })
  @ApiOkResponse({
    description: "Semana normalizada con filas por agronomo y totales."
  })
  @ApiBadRequestResponse({ description: "La fecha no es valida." })
  async getWeek(@Param() params: EstimationWeekParamDto) {
    return createSuccessResponse(await this.estimacionesService.getWeek(params.fecha));
  }

  @Put("semanas/:fecha")
  @AllowAnalystMutation()
  @ApiOperation({
    summary: "Guarda un lote de estimaciones semanales por agronomo."
  })
  @ApiOkResponse({ description: "Semana actualizada y recalculada." })
  @ApiBadRequestResponse({
    description: "Fecha, cantidad, duplicados o agronomos no validos."
  })
  @ApiForbiddenResponse({
    description: "El usuario autenticado no puede administrar estimaciones."
  })
  async saveWeek(
    @Param() params: EstimationWeekParamDto,
    @Body() body: SaveWeekEstimatesDto,
    @CurrentAuthUser() currentUser: AccessTokenPayload
  ) {
    return createSuccessResponse(
      await this.estimacionesService.saveWeek(
        params.fecha,
        body.estimaciones,
        currentUser.userId
      )
    );
  }
}
