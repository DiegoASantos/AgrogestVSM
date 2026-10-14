import { Body, Controller, Get, Header, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AllowAnalystMutation } from "../../auth/presentation/decorators/allow-analyst-mutation.decorator";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { RecepcionesSystraceService } from "../application/recepciones-systrace.service";
import { FindRecepcionesSystraceQueryDto } from "./dto/find-recepciones-systrace-query.dto";
import { VincularProductorSystraceDto } from "./dto/vincular-productor-systrace.dto";

@ApiTags("Recepciones Systrace para pagos")
@ApiBearerAuth()
@Controller("pagos")
@Roles("ADMIN", "ANALISTA")
export class RecepcionesSystraceController {
  constructor(private readonly recepciones: RecepcionesSystraceService) {}

  @Get("recepciones-systrace")
  @Header("Cache-Control", "no-store")
  search(@Query() query: FindRecepcionesSystraceQueryDto) {
    return this.recepciones.search(query);
  }

  @Post("vinculos-systrace")
  @Header("Cache-Control", "no-store")
  @AllowAnalystMutation()
  link(
    @Body() dto: VincularProductorSystraceDto,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    return this.recepciones.link(dto, user.userId);
  }
}
