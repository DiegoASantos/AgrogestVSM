import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import {
  createPaginatedMeta,
  createSuccessResponse
} from "../../../common/http/api-response";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { TipoRecomendacionEntity } from "../infrastructure/persistence/entities/tipo-recomendacion.entity";

@Injectable()
export class RecommendationTypesService {
  constructor(
    @InjectRepository(TipoRecomendacionEntity)
    private readonly tiposRecomendacionRepository: Repository<TipoRecomendacionEntity>
  ) {}

  async findAll(pagination: PaginationQueryDto) {
    const [recommendationTypes, total] =
      await this.tiposRecomendacionRepository.findAndCount({
        order: {
          name: "ASC"
        },
        skip: pagination.skip,
        take: pagination.take
      });

    return createSuccessResponse(
      recommendationTypes.map((recommendationType) => ({
        id: recommendationType.id,
        name: recommendationType.name,
        isActive: recommendationType.isActive
      })),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }
}
