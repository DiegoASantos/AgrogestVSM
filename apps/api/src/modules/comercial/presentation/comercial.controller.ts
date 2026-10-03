import { Body, Controller, Get, Header, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { ComercialService } from "../application/comercial.service";
import { ProducerCreditorAccessService } from "../application/producer-creditor-access.service";
import { CreateAcreedorCosechaDto } from "./dto/create-acreedor-cosecha.dto";
import { CreatePagoCosechaDto } from "./dto/create-pago-cosecha.dto";
import { CreateRegistroCosechaDto } from "./dto/create-registro-cosecha.dto";
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
