import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { AllowAnalystMutation } from "../../auth/presentation/decorators/allow-analyst-mutation.decorator";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { AdminAcreedoresCosechaService } from "../application/admin-acreedores-cosecha.service";
import { PagosProductoresService } from "../application/pagos-productores.service";
import {
  CreateDetallePagoProductorDto,
  UpdateDetallePagoProductorDto
} from "./dto/create-detalle-pago-productor.dto";
import { CreatePagoProductorDto } from "./dto/create-pago-productor.dto";
import { UpdatePagoProductorDto } from "./dto/update-pago-productor.dto";
import { GuardarDetallesPagoProductorDto } from "./dto/guardar-detalles-pago-productor.dto";
import {
  CrearPagoCompletoDto,
  EditarPagoCompletoDto
} from "./dto/pago-productor-completo.dto";
import { CrearAcreedorAprobadoPagoDto } from "./dto/crear-acreedor-aprobado-pago.dto";
import { FindAdminAcreedoresCosechaQueryDto } from "./dto/find-admin-acreedores-cosecha-query.dto";
import {
  CreateAdminAcreedorCosechaDto,
  UpdateAdminAcreedorCosechaDto
} from "./dto/upsert-admin-acreedor-cosecha.dto";

@ApiTags("Pagos de productores")
@ApiBearerAuth()
@Controller("pagos")
@Roles("ADMIN", "ANALISTA")
export class PagosProductoresController {
  constructor(private readonly pagos: PagosProductoresService) {}

  @Get("catalogos")
  @Header("Cache-Control", "no-store")
  catalogs() {
    return this.pagos.catalogs();
  }

  @Get("productores")
  @Header("Cache-Control", "no-store")
  list(
    @Query() pagination: PaginationQueryDto,
    @Query("productorId") productorId?: string,
    @Query("estado") estado?: string
  ) {
    return this.pagos.list(pagination, productorId, estado);
  }

  @Post("productores")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  create(
    @Body() dto: CreatePagoProductorDto,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    return this.pagos.create(dto, user.userId);
  }

  @Get("acreedores-aprobados")
  @Header("Cache-Control", "no-store")
  approvedCreditorsByProducer(
    @Query("productorId", new ParseUUIDPipe()) productorId: string
  ) {
    return this.pagos.approvedCreditorsByProducer(productorId);
  }

  @Post("productores/completo")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  createComplete(
    @Body() dto: CrearPagoCompletoDto,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    return this.pagos.createComplete(dto, user.userId);
  }

  @Patch("productores/:id/completo")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  updateComplete(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: EditarPagoCompletoDto
  ) {
    return this.pagos.updateComplete(id, dto);
  }

  @Get("productores/:id")
  @Header("Cache-Control", "no-store")
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.pagos.findOne(id);
  }

  @Patch("productores/:id")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePagoProductorDto
  ) {
    return this.pagos.update(id, dto);
  }

  @Delete("productores/:id")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  remove(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.pagos.remove(id);
  }

  @Get("productores/:id/detalles")
  @Header("Cache-Control", "no-store")
  listDetails(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.pagos.listDetails(id);
  }

  @Get("productores/:id/acreedores-aprobados")
  @Header("Cache-Control", "no-store")
  approvedCreditors(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.pagos.approvedCreditors(id);
  }

  @Post("productores/:id/acreedores-aprobados")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  createApprovedCreditor(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: CrearAcreedorAprobadoPagoDto,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    return this.pagos.createApprovedCreditor(id, dto, user.userId);
  }

  @Post("productores/:id/detalles/lote")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  saveDetailsBatch(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: GuardarDetallesPagoProductorDto
  ) {
    return this.pagos.saveDetailsBatch(id, dto);
  }

  @Post("productores/:id/detalles")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  createDetail(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: CreateDetallePagoProductorDto
  ) {
    return this.pagos.createDetail(id, dto);
  }

  @Patch("productores/:id/detalles/:detailId")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  updateDetail(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("detailId", new ParseUUIDPipe()) detailId: string,
    @Body() dto: UpdateDetallePagoProductorDto
  ) {
    return this.pagos.updateDetail(id, detailId, dto);
  }

  @Delete("productores/:id/detalles/:detailId")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  removeDetail(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Param("detailId", new ParseUUIDPipe()) detailId: string
  ) {
    return this.pagos.removeDetail(id, detailId);
  }
}

@ApiTags("Mantenimiento de acreedores de cosecha")
@ApiBearerAuth()
@Controller("comercial/mantenimiento/acreedores-cosecha")
@Roles("ADMIN", "ANALISTA")
export class AdminAcreedoresCosechaController {
  constructor(private readonly acreedores: AdminAcreedoresCosechaService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  list(@Query() query: FindAdminAcreedoresCosechaQueryDto) {
    return this.acreedores.list(query, query.search);
  }

  @Get(":id")
  @Header("Cache-Control", "no-store")
  findOne(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.acreedores.findOne(id);
  }

  @Post()
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  create(
    @Body() dto: CreateAdminAcreedorCosechaDto,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    return this.acreedores.create(dto, user.userId);
  }

  @Patch(":id")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAdminAcreedorCosechaDto
  ) {
    return this.acreedores.update(id, dto);
  }

  @Delete(":id")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  remove(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.acreedores.remove(id);
  }
}
