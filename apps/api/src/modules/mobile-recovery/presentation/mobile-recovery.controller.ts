import { Controller, Get, Header, Query, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { MobileRecoveryService } from "../application/mobile-recovery.service";

@ApiTags("Recuperación móvil")
@Controller("mobile/recuperacion")
@Roles("AGRONOMO")
export class MobileRecoveryController {
  constructor(private readonly recovery: MobileRecoveryService) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: "Recupera actividad sincronizada reciente del usuario autenticado." })
  @ApiQuery({ name: "cursor", required: false, type: String, description: "Cursor de continuación devuelto por la página anterior." })
  @ApiOkResponse({ description: "Página de actividad atribuida al usuario autenticado." })
  getPage(@Query("cursor") cursor: string | undefined, @CurrentAuthUser() user: AccessTokenPayload) {
    return this.recovery.getPage(user, cursor);
  }
}
