import { Controller, Get, Query } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ClimaService } from "../application/clima.service";

@ApiTags("Clima")
@Roles("ADMIN")
@Controller("clima")
export class ClimaController {
  constructor(private readonly climaService: ClimaService) {}
  @Get("resumen")
  @Roles("ADMIN", "ANALISTA", "AGRONOMO")
  @ApiOperation({ summary: "Resumen climático territorial." })
  @ApiOkResponse({ description: "Condiciones y alertas." })
  summary() {
    return this.climaService.summary();
  }
  @Get("mapa")
  @Roles("ADMIN", "ANALISTA", "AGRONOMO")
  map() {
    return this.climaService.map();
  }
  @Get("pronostico")
  @Roles("ADMIN", "ANALISTA", "AGRONOMO")
  forecast(@Query("punto_id") pointId?: string) {
    return this.climaService.forecast(pointId);
  }
  @Get("historico")
  @Roles("ADMIN", "ANALISTA", "AGRONOMO")
  history(
    @Query("punto_id") pointId: string,
    @Query("desde") start?: string,
    @Query("hasta") end?: string
  ) {
    return this.climaService.history(pointId, start, end);
  }
  @Get("puntos")
  @Roles("ADMIN", "ANALISTA", "AGRONOMO")
  points() {
    return this.climaService.pointsResponse();
  }
  @Get("estaciones")
  @Roles("ADMIN", "ANALISTA", "AGRONOMO")
  stations() {
    return this.climaService.stations();
  }
  @Get("alertas")
  @Roles("ADMIN", "ANALISTA", "AGRONOMO")
  alerts() {
    return this.climaService.alerts();
  }
  @Get("fuentes")
  @Roles("ADMIN", "ANALISTA", "AGRONOMO")
  sources() {
    return this.climaService.sources().then((data) => ({ success: true, data }));
  }
}
