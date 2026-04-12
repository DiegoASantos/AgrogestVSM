import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import {
  createPaginatedMeta,
  createSuccessResponse
} from "../../../common/http/api-response";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { VariedadEntity } from "../infrastructure/persistence/entities/variedad.entity";

@Injectable()
export class VariedadesService {
  constructor(
    @InjectRepository(VariedadEntity)
    private readonly variedadesRepository: Repository<VariedadEntity>
  ) {}

  async findAll(pagination: PaginationQueryDto) {
    const [variedades, total] = await this.variedadesRepository.findAndCount({
      order: {
        cultivoId: "ASC",
        name: "ASC"
      },
      skip: pagination.skip,
      take: pagination.take
    });

    return createSuccessResponse(
      variedades.map((variedad) => this.toResponse(variedad)),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }

  async findById(id: string) {
    const variedad = await this.variedadesRepository.findOne({
      where: { id }
    });

    if (!variedad) {
      throw new NotFoundException("Variedad not found.");
    }

    return createSuccessResponse(this.toResponse(variedad));
  }

  async findByCultivoId(cultivoId: string) {
    const variedades = await this.variedadesRepository.find({
      where: {
        cultivoId
      },
      order: {
        name: "ASC"
      }
    });

    return createSuccessResponse(
      variedades.map((variedad) => this.toResponse(variedad)),
      {
        count: variedades.length
      }
    );
  }

  private toResponse(variedad: VariedadEntity) {
    return {
      id: variedad.id,
      cultivoId: variedad.cultivoId,
      code: variedad.code,
      name: variedad.name,
      isActive: variedad.isActive
    };
  }
}
