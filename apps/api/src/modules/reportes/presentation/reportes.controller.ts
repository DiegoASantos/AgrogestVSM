import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";

import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ReportesService } from "../application/reportes.service";
import { ReporteCamposEtapasQueryDto } from "./dto/reporte-campos-etapas-query.dto";
import { ReporteParcelasQueryDto } from "./dto/reporte-parcelas-query.dto";
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

  @Get("campos-por-etapas")
  @ApiOperation({
    summary: "Agrupa parcelas por el agronomo y la etapa de su ultima visita activa."
  })
  @ApiOkResponse({
    description: "Resumen por ingeniero, catalogo y parcelas para el mapa."
  })
  @ApiBadRequestResponse({
    description: "Los identificadores de filtro no son validos."
  })
  async getFieldsByStageReport(@Query() query: ReporteCamposEtapasQueryDto) {
    const data = await this.reportesService.getFieldsByStageReport(query);
    return { success: true, data };
  }

  @Get("parcelas")
  @ApiOperation({
    summary: "Resume parcelas y hectáreas por ingeniero y categoría de área."
  })
  @ApiOkResponse({
    description: "Resumen, distribuciones y parcelas categorizadas para el mapa."
  })
  @ApiBadRequestResponse({
    description: "Los identificadores o el estado de filtro no son válidos."
  })
  async getParcelsReport(@Query() query: ReporteParcelasQueryDto) {
    const data = await this.reportesService.getParcelsReport(query);
    return { success: true, data };
  }
}
