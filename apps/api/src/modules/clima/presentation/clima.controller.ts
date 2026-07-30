import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { ClimaService } from '../application/clima.service';

@ApiTags('Clima')
@Roles('ADMIN')
@Controller('clima')
export class ClimaController {
  constructor(private readonly climaService: ClimaService) {}
  @Get('resumen') @ApiOperation({ summary: 'Resumen climático territorial.' }) @ApiOkResponse({ description: 'Condiciones y alertas.' }) summary() { return this.climaService.summary(); }
  @Get('mapa') map() { return this.climaService.map(); }
  @Get('pronostico') forecast(@Query('punto_id') pointId?: string) { return this.climaService.forecast(pointId); }
  @Get('historico') history(@Query('punto_id') pointId: string, @Query('desde') start?: string, @Query('hasta') end?: string) { return this.climaService.history(pointId, start, end); }
  @Get('puntos') points() { return this.climaService.pointsResponse(); }
  @Get('estaciones') stations() { return this.climaService.stations(); }
  @Get('alertas') alerts() { return this.climaService.alerts(); }
  @Get('fuentes') sources() { return this.climaService.sources().then((data) => ({ success: true, data })); }
}
