import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req
} from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnalystMutation } from "../../auth/presentation/decorators/allow-analyst-mutation.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { ClimaService } from "../application/clima.service";
import { WeatherLinkQueryService } from "../application/weatherlink-query.service";
import type { AuthenticatedRequest } from "../../auth/types/auth.types";
import { CreateReservoirReadingDto } from "./dto/create-reservoir-reading.dto";
import { FindReservoirHistoryQueryDto } from "./dto/find-reservoir-history-query.dto";
import { UpdateReservoirReadingDto } from "./dto/update-reservoir-reading.dto";
import { UpdateWeatherLinkStationDto } from "./dto/update-weatherlink-station.dto";

@ApiTags("Clima")
@Roles("ADMIN")
@Controller("clima")
export class ClimaController {
  constructor(
    private readonly climaService: ClimaService,
    private readonly weatherLinkQuery: WeatherLinkQueryService
  ) {}
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
    @Query("punto_id") pointId?: string,
    @Query("estacion_id") stationId?: string,
    @Query("desde") start?: string,
    @Query("hasta") end?: string,
    @Req() req?: AuthenticatedRequest
  ) {
    return this.climaService.history(pointId, stationId, start, end, req?.user.sub);
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
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query() query: FindReservoirHistoryQueryDto
  ) {
    return this.climaService.getReservorioHistory(
      id,
      query.variable,
      query.desde,
      query.hasta
    );
  }

  @Post("reservorios/:id/lecturas")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  createReservorioLectura(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: CreateReservoirReadingDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.climaService.createReservorioReading(
      id,
      { ...body, valor: Number(body.valor) },
      req.user.sub
    );
  }

  @Put("reservorios/:id/lecturas/:lecturaId")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  updateReservorioLectura(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("lecturaId", new ParseUUIDPipe()) lecturaId: string,
    @Body() body: UpdateReservoirReadingDto
  ) {
    return this.climaService.updateReservorioReading(id, lecturaId, {
      ...body,
      valor: body.valor === undefined ? undefined : Number(body.valor)
    });
  }

  @Delete("reservorios/:id/lecturas/:lecturaId")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  deleteReservorioLectura(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("lecturaId", new ParseUUIDPipe()) lecturaId: string
  ) {
    return this.climaService.deleteReservorioReading(id, lecturaId);
  }

  @Get("fuentes/weatherlink/estado")
  @Roles("ADMIN", "ANALISTA", "AGRONOMO")
  @ApiOperation({ summary: "Estado del modo de consulta directa WeatherLink." })
  weatherLinkStatus() {
    return { success: true, data: this.weatherLinkQuery.status() };
  }

  @Post("fuentes/weatherlink/sincronizar")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Compatibilidad: la sincronizacion diaria esta inactiva." })
  forceWeatherLinkSync() {
    return { success: true, data: { started: false, mode: "DIRECT_QUERY" } };
  }

  @Post("fuentes/weatherlink/estaciones/actualizar")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Actualiza solo el catalogo de estaciones WeatherLink." })
  refreshWeatherLinkStations() {
    return this.weatherLinkQuery
      .refreshStations()
      .then((data) => ({ success: true, data }));
  }

  @Put("estaciones/:id/activo")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Activa o desactiva una estacion WeatherLink." })
  async updateWeatherLinkStation(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() body: UpdateWeatherLinkStationDto
  ) {
    const data = await this.weatherLinkQuery.setStationActive(id, body.isActive);
    return { success: true, data };
  }
}
