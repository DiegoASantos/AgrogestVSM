import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ClimaService } from "../application/clima.service";
import type { AuthenticatedRequest } from "../../auth/types/auth.types";

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

  @Get("reservorios")
  @Roles("ADMIN", "ANALISTA", "AGRONOMO")
  async reservorios() {
    const data = await this.climaService.getReservorios();
    return { success: true, data };
  }

  @Get("reservorios/:id/historico")
  @Roles("ADMIN", "ANALISTA", "AGRONOMO")
  reservorioHistorico(
    @Param("id") id: string,
    @Query("variable") variable?: string,
    @Query("desde") desde?: string,
    @Query("hasta") hasta?: string
  ) {
    return this.climaService.getReservorioHistory(id, variable, desde, hasta);
  }

  @Post("reservorios/:id/lecturas")
  @Roles("ADMIN", "ANALISTA")
  createReservorioLectura(
    @Param("id") id: string,
    @Body() body: { variable: string; valor: number; unidad: string; tipo?: string; dato_at: string },
    @Req() req: AuthenticatedRequest
  ) {
    return this.climaService.createReservorioReading(id, body, req.user.sub);
  }

  @Put("reservorios/:id/lecturas/:lecturaId")
  @Roles("ADMIN", "ANALISTA")
  updateReservorioLectura(
    @Param("id") id: string,
    @Param("lecturaId") lecturaId: string,
    @Body() body: { variable?: string; valor?: number; unidad?: string; tipo?: string; dato_at?: string }
  ) {
    return this.climaService.updateReservorioReading(id, lecturaId, body);
  }

  @Delete("reservorios/:id/lecturas/:lecturaId")
  @Roles("ADMIN", "ANALISTA")
  deleteReservorioLectura(
    @Param("id") id: string,
    @Param("lecturaId") lecturaId: string
  ) {
    return this.climaService.deleteReservorioReading(id, lecturaId);
  }
}
