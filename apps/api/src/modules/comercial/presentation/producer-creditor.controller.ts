import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ProducerCreditorAccessService } from "../application/producer-creditor-access.service";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import { Public } from "../../auth/presentation/decorators/public.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import { AllowAnalystMutation } from "../../auth/presentation/decorators/allow-analyst-mutation.decorator";
import { LoginThrottlerGuard } from "../../auth/presentation/guards/login-throttler.guard";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import {
  ExchangeProducerCodeDto,
  PublicAcreedorCosechaDto,
  ReviewCreditorDto,
  UpdatePublicAcreedorCosechaDto
} from "./dto/public-acreedor-cosecha.dto";
import { ProducerCodeThrottlerGuard } from "./producer-code-throttler.guard";

@ApiTags("Comercial productor")
@Controller("comercial/productor")
export class ProducerCreditorController {
  constructor(private readonly access: ProducerCreditorAccessService) {}

  @Post("sesion")
  @Public()
  @UseGuards(LoginThrottlerGuard, ProducerCodeThrottlerGuard)
  @Header("Cache-Control", "no-store")
  @HttpCode(200)
  exchange(@Body() dto: ExchangeProducerCodeDto) {
    return this.access.exchange(dto.code);
  }

  @Get("acreedores")
  @Public()
  @Header("Cache-Control", "no-store")
  ownCreditors(@Headers("authorization") authorization?: string) {
    return this.access.ownCreditors(authorization);
  }

  @Get("acreedores/:id/historial")
  @Public()
  @Header("Cache-Control", "no-store")
  ownHistory(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string
  ) {
    return this.access.ownHistory(authorization, id);
  }

  @Post("acreedores")
  @Public()
  @Header("Cache-Control", "no-store")
  create(
    @Headers("authorization") authorization: string | undefined,
    @Body() dto: PublicAcreedorCosechaDto
  ) {
    return this.access.createCreditor(authorization, dto);
  }

  @Patch("acreedores/:id")
  @Public()
  @Header("Cache-Control", "no-store")
  update(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() dto: UpdatePublicAcreedorCosechaDto
  ) {
    return this.access.updateCreditor(authorization, id, dto);
  }
}

@ApiTags("Comercial revisión")
@ApiBearerAuth()
@Controller("comercial/revision-acreedores")
export class CreditorReviewController {
  constructor(private readonly access: ProducerCreditorAccessService) {}

  @Get()
  @Roles("ADMIN", "ANALISTA")
  @Header("Cache-Control", "no-store")
  list(@Query("status") status?: string, @Query("page") page?: string) {
    return this.access.reviewList(status, page ? Number(page) : 1);
  }

  @Get(":id/historial")
  @Roles("ADMIN", "ANALISTA")
  @Header("Cache-Control", "no-store")
  history(@Param("id") id: string) {
    return this.access.history(id);
  }

  @Post(":id")
  @Roles("ADMIN", "ANALISTA")
  @AllowAnalystMutation()
  @Header("Cache-Control", "no-store")
  review(
    @Param("id") id: string,
    @Body() dto: ReviewCreditorDto,
    @CurrentAuthUser() user: AccessTokenPayload
  ) {
    return this.access.review(id, dto, user);
  }
}
