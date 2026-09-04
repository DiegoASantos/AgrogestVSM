import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";

import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ReportesService } from "../application/reportes.service";
import { ReporteVisitasQueryDto } from "./dto/reporte-visitas-query.dto";

@ApiTags("Reportes")
@Roles("ADMIN", "ANALISTA")
@Controller("reportes")
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get("visitas")
  @ApiOperation({
    summary: "Resume las visitas activas y hectareas observadas por dia."
  })
  @ApiOkResponse({
    description: "Resumen por ingeniero y serie diaria del rango solicitado."
  })
  @ApiBadRequestResponse({
    description: "El rango o los identificadores de filtro no son validos."
  })
  async getVisitsReport(@Query() query: ReporteVisitasQueryDto) {
    const data = await this.reportesService.getVisitsReport(query);
    return { success: true, data };
  }
}
