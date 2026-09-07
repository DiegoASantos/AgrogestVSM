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

@ApiTags("Estimaciones")
@Roles("ADMIN", "ANALISTA")
@Controller("estimaciones")
export class EstimacionesController {
  constructor(private readonly estimacionesService: EstimacionesService) {}

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
