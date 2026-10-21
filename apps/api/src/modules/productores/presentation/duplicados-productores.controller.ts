import { Body, Controller, Get, Header, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AllowAnalystMutation } from "../../auth/presentation/decorators/allow-analyst-mutation.decorator";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { DuplicadosProductoresService } from "../application/duplicados-productores.service";
import { BadRequestException } from "@nestjs/common";

@ApiTags("Productores duplicados")
@Roles("ADMIN", "ANALISTA")
@Controller("mantenimiento/productores-duplicados")
export class DuplicadosProductoresController {
  constructor(private readonly service: DuplicadosProductoresService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Lista posibles personas productoras duplicadas y el autor de cada ficha." })
  list() { return this.service.list(); }

  @Post("escanear")
  @AllowAnalystMutation()
  @ApiOperation({ summary: "Revisa fichas existentes de forma idempotente." })
  scan() { return this.service.scanExisting(); }

  @Post("proponer")
  @AllowAnalystMutation()
  @ApiOperation({ summary: "Propone manualmente dos personas para revisión." })
  propose(@Body() body: { firstId?: string; secondId?: string }) {
    return this.service.propose(requireId(body?.firstId), requireId(body?.secondId));
  }

  @Get(":id/previa")
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Muestra relaciones y conflictos antes de unificar." })
  preview(@Param("id") id: string, @Query("principalId") principalId: string) {
    return this.service.preview(requireId(id), requireId(principalId));
  }

  @Post(":id/descartar")
  @AllowAnalystMutation()
  @ApiOperation({ summary: "Descarta un candidato que corresponde a personas distintas." })
  dismiss(@Param("id") id: string, @CurrentAuthUser() user: AccessTokenPayload) {
    return this.service.dismiss(requireId(id), user.userId);
  }

  @Post(":id/unificar")
  @AllowAnalystMutation()
  @ApiOperation({ summary: "Unifica dos fichas con resolución explícita y auditoría." })
  merge(
    @Param("id") id: string,
    @Body() body: {
      principalId?: string;
      fingerprint?: string;
      parcelMappings?: Array<{ sourceParcelId: string; targetParcelId: string }>;
      creditorMappings?: Array<{ sourceCreditorId: string; targetCreditorId: string }>;
    },
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    if (!/^[a-f0-9]{64}$/.test(body?.fingerprint ?? "")) {
      throw new BadRequestException("Vista previa inválida.");
    }
    if (!Array.isArray(body.parcelMappings) || body.parcelMappings.length > 1000) {
      throw new BadRequestException("Resolución de parcelas inválida.");
    }
    if (!Array.isArray(body.creditorMappings) || body.creditorMappings.length > 1000) {
      throw new BadRequestException("Resolución de acreedores inválida.");
    }
    const parcelMappings = body.parcelMappings.map((row) => ({
      sourceParcelId: requireId(row?.sourceParcelId),
      targetParcelId: requireId(row?.targetParcelId)
    }));
    const creditorMappings = body.creditorMappings.map((row) => ({
      sourceCreditorId: requireId(row?.sourceCreditorId),
      targetCreditorId: requireId(row?.targetCreditorId)
    }));
    return this.service.merge({
      caseId: requireId(id), principalId: requireId(body.principalId),
      fingerprint: body.fingerprint!, parcelMappings, creditorMappings, userId: user.userId
    });
  }
}

function requireId(value: unknown): string {
  if (typeof value !== "string" || !/^[1-9]\d{0,18}$/.test(value) ||
      BigInt(value) > 9223372036854775807n) {
    throw new BadRequestException("Identificador inválido.");
  }
  return value;
}
