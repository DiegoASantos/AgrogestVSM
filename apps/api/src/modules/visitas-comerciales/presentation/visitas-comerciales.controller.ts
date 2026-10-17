import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { VisitasComercialesService } from "../application/visitas-comerciales.service";
import { CreateVisitaComercialDto } from "./dto/create-visita-comercial.dto";
import { FindVisitasComercialesQueryDto } from "./dto/find-visitas-comerciales-query.dto";
import { ExportVisitasComercialesQueryDto } from "./dto/export-visitas-comerciales-query.dto";

@ApiTags("Visitas comerciales")
@Controller("visitas-comerciales")
export class VisitasComercialesController {
  constructor(private readonly visits: VisitasComercialesService) {}

  @Post()
  @Roles("AGRONOMO", "ADMIN")
  @Header("Cache-Control", "private, no-store")
  @ApiOperation({
    summary: "Crea una visita comercial idempotente del usuario autenticado."
  })
  create(
    @Body() dto: CreateVisitaComercialDto,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    return this.visits.create(dto, user);
  }

  @Get()
  @Roles("AGRONOMO", "ADMIN", "ANALISTA")
  @Header("Cache-Control", "private, no-store")
  list(
    @Query() query: FindVisitasComercialesQueryDto,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    return this.visits.list(query, user);
  }

  @Get("reporte-excel")
  @Roles("ADMIN", "ANALISTA")
  @ApiOperation({ summary: "Descarga visitas técnicas, comerciales o ambas en Excel." })
  async exportExcel(
    @Query() query: ExportVisitasComercialesQueryDto,
    @Res() reply: FastifyReply,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    const report = await this.visits.exportExcel(query, user);
    return reply
      .header("Cache-Control", "private, no-store")
      .header("Content-Disposition", `attachment; filename="${report.fileName}"`)
      .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .send(report.content);
  }

  @Get(":id/reporte-pdf")
  @Roles("ADMIN", "ANALISTA")
  @ApiOperation({ summary: "Descarga el reporte PDF de una visita comercial." })
  async exportPdf(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Res() reply: FastifyReply,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    const report = await this.visits.exportPdf(id, user);
    return reply
      .header("Cache-Control", "private, no-store")
      .header("Content-Disposition", `attachment; filename="${report.fileName}"`)
      .type("application/pdf")
      .send(report.content);
  }

  @Get(":id")
  @Roles("AGRONOMO", "ADMIN", "ANALISTA")
  @Header("Cache-Control", "private, no-store")
  get(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    return this.visits.get(id, user);
  }
}
