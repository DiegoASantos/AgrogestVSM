import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createSuccessResponse } from "../../../common/http/api-response";
import { ProductoresService } from "../../productores/application/productores.service";
import type { AccessTokenPayload } from "../../auth/types/auth.types";
import { PagoCosechaEntity } from "../infrastructure/persistence/entities/pago-cosecha.entity";
import { CreatePagoCosechaDto } from "../presentation/dto/create-pago-cosecha.dto";
@Injectable()
export class ComercialService {
  constructor(
    @InjectRepository(PagoCosechaEntity)
    private readonly pagos: Repository<PagoCosechaEntity>,
    private readonly productores: ProductoresService
  ) {}

  async create(dto: CreatePagoCosechaDto, user: AccessTokenPayload) {
    const expected = dto.creditorDocumentType === "DNI" ? 8 : 11;
    if (dto.creditorDocumentNumber.length !== expected) {
      throw new BadRequestException(
        `El ${dto.creditorDocumentType} debe tener ${expected} digitos.`
      );
    }

    const existing = dto.publicId
      ? await this.pagos.findOne({ where: { publicId: dto.publicId } })
      : null;

    if (existing) {
      await this.productores.findById(existing.productorId, user);
      return createSuccessResponse(existing);
    }

    await this.productores.findById(dto.productorId, user);
    const payment = this.pagos.create({ ...dto, createdByUserId: user.userId });
    return createSuccessResponse(await this.pagos.save(payment));
  }
}
