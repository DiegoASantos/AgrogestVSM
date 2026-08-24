import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { DashboardService } from "../application/dashboard.service";
import {
  DashboardDateRangeQueryDto,
  DashboardParcelasPorEtapaQueryDto
} from "./dto/dashboard-metrics-query.dto";

@ApiTags("Dashboard")
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("resumen")
  @ApiOperation({ summary: "Devuelve el resumen completo del dashboard." })
  @ApiQuery({
    name: "year",
    required: false,
    type: Number,
    description: "Año para filtrar visitas por mes. Por defecto el año actual."
  })
  async getResumen(@Query("year") year?: string) {
    const parsedYear = year ? Number(year) : undefined;
    const data = await this.dashboardService.getResumen(parsedYear);
    return { success: true, data };
  }

  @Get("visitas-por-agronomo")
  @ApiOperation({
    summary: "Cuenta las visitas activas agrupadas por agronomo en un rango de fechas."
  })
  async getVisitasPorAgronomo(@Query() query: DashboardDateRangeQueryDto) {
    const data = await this.dashboardService.getVisitasPorAgronomo(query);
    return { success: true, data };
  }

  @Get("parcelas-por-etapa")
  @ApiOperation({
    summary:
      "Agrupa parcelas por la etapa de su visita activa mas reciente dentro de un rango."
  })
  async getParcelasPorEtapa(@Query() query: DashboardParcelasPorEtapaQueryDto) {
    const data = await this.dashboardService.getParcelasPorEtapa(query);
    return { success: true, data };
  }
}
