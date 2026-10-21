import { Body, Controller, Get, Header, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { ComercialService } from "../application/comercial.service";
import { ProducerCreditorAccessService } from "../application/producer-creditor-access.service";
import { CreateAcreedorCosechaDto } from "./dto/create-acreedor-cosecha.dto";
import { CreatePagoCosechaDto } from "./dto/create-pago-cosecha.dto";
import { CreateRegistroCosechaDto } from "./dto/create-registro-cosecha.dto";
import { CompleteAcreedorCosechaDto } from "./dto/complete-acreedor-cosecha.dto";
import { CreateAcreedorIdentidadDto } from "./dto/create-acreedor-identidad.dto";
@ApiTags("Comercial")
@ApiBearerAuth()
@Controller("comercial")
export class ComercialController {
  constructor(private readonly service: ComercialService, private readonly access: ProducerCreditorAccessService) {}

  @Post("productores/:productorId/acceso-acreedores")
  @Roles("ADMIN", "AGRONOMO")
  @Header("Cache-Control", "no-store")
  @ApiCreatedResponse({ description: "Emite un nuevo código y revoca el anterior." })
  issueProducerAccess(@Param("productorId") productorId: string, @CurrentAuthUser() user: AccessTokenPayload) {
    return this.access.issue(productorId, user);
  }
  @Post("pagos-cosecha")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "AGRONOMO")
  @ApiCreatedResponse({
    description: "Pago de cosecha creado o recuperado por idempotencia."
  })
  create(@Body() dto: CreatePagoCosechaDto, @CurrentAuthUser() user: AccessTokenPayload) {
    return this.service.create(dto, user);
  }

  @Post("acreedores-cosecha")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "AGRONOMO")
  @ApiCreatedResponse({ description: "Acreedor creado o recuperado por idempotencia." })
  createCreditor(
    @Body() dto: CreateAcreedorCosechaDto,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    return this.service.createCreditor(dto, user);
  }

  @Post("acreedores-cosecha/identidad")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "AGRONOMO")
  createCreditorIdentity(
    @Body() dto: CreateAcreedorIdentidadDto,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    return this.service.createCreditorIdentity(dto, user);
  }

  @Patch("acreedores-cosecha/:id/completar")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "AGRONOMO")
  completeCreditor(
    @Param("id") id: string,
    @Body() dto: CompleteAcreedorCosechaDto,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    return this.service.completeCreditor(id, dto.bank, dto.accountNumber, user);
  }

  @Get("productores/:productorId/acreedores-cosecha")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "AGRONOMO")
  @ApiOkResponse({ description: "Acreedores disponibles para el productor." })
  findCreditors(
    @Param("productorId") productorId: string,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    return this.service.findCreditors(productorId, user);
  }

  @Post("registros-cosecha")
  @Header("Cache-Control", "no-store")
  @Roles("ADMIN", "AGRONOMO")
  @ApiCreatedResponse({ description: "Registro de cosecha creado o recuperado por idempotencia." })
  createHarvestRecord(
    @Body() dto: CreateRegistroCosechaDto,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    return this.service.createHarvestRecord(dto, user);
  }
}
