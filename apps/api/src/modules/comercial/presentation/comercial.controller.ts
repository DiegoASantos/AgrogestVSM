import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from "@nestjs/swagger";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { ComercialService } from "../application/comercial.service";
import { CreatePagoCosechaDto } from "./dto/create-pago-cosecha.dto";
@ApiTags("Comercial")
@ApiBearerAuth()
@Controller("comercial/pagos-cosecha")
export class ComercialController {
  constructor(private readonly service: ComercialService) {}
  @Post()
  @Roles("ADMIN", "AGRONOMO")
  @ApiCreatedResponse({
    description: "Pago de cosecha creado o recuperado por idempotencia."
  })
  create(@Body() dto: CreatePagoCosechaDto, @CurrentAuthUser() user: AccessTokenPayload) {
    return this.service.create(dto, user);
  }
}
