import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { FastifyReply, FastifyRequest } from "fastify";
import { CurrentAuthUser } from "../../auth/presentation/decorators/current-auth-user.decorator";
import { Roles } from "../../auth/presentation/decorators/roles.decorator";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { FotosComercialesService } from "../application/fotos-comerciales.service";
import { FindFotosComercialesProductoresQueryDto } from "./dto/find-fotos-comerciales-productores-query.dto";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";

@ApiTags("Fotos comerciales por productor")
@ApiBearerAuth()
@Controller("comercial")
export class FotosComercialesController {
  constructor(private readonly photos: FotosComercialesService) {}

  @Post("productores/:productorId/fotos")
  @Roles("AGRONOMO")
  @Header("Cache-Control", "no-store")
  async upload(
    @Param("productorId") producerId: string,
    @Headers("x-photo-id") photoId: string,
    @CurrentAuthUser() user: AccessTokenPayload,
    @Req() request: FastifyRequest
  ) {
    const producer = await this.photos.assertProducerAccess(producerId, user);
    if (!photoId) throw new BadRequestException("Falta identificador de foto.");
    const part = await request.file();
    if (!part || part.mimetype !== "image/jpeg") {
      throw new BadRequestException("Se requiere una imagen JPEG.");
    }
    let data: Buffer;
    try {
      data = await part.toBuffer();
    } catch {
      throw new BadRequestException("La foto supera el tamaño permitido.");
    }
    return this.photos.upload(producer, photoId, data, user.userId);
  }

  @Get("mantenimiento/productores-con-fotos")
  @Roles("ADMIN", "ANALISTA")
  @Header("Cache-Control", "no-store")
  listProducers(@Query() query: FindFotosComercialesProductoresQueryDto) {
    return this.photos.listProducers(query.page, query.take, query.search ?? "");
  }

  @Get("mantenimiento/productores/:productorId/fotos")
  @Roles("ADMIN", "ANALISTA")
  @Header("Cache-Control", "no-store")
  listForProducer(
    @Param("productorId") producerId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.photos.listForProducer(producerId, query.page, query.take);
  }

  @Get("mantenimiento/fotos/:publicId/contenido")
  @Roles("ADMIN", "ANALISTA")
  async content(
    @Param("publicId", new ParseUUIDPipe()) publicId: string,
    @CurrentAuthUser() user: AccessTokenPayload,
    @Res() reply: FastifyReply
  ) {
    const data = await this.photos.read(publicId, user.userId);
    reply.header("Cache-Control", "no-store");
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Content-Disposition", "inline");
    reply.type("image/jpeg");
    return reply.send(data);
  }
}
