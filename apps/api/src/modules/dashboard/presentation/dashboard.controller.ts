import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";

import { DashboardService } from "../application/dashboard.service";

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
}
