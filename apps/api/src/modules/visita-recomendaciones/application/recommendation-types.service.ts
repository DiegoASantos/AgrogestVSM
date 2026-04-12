import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { TipoRecomendacionEntity } from "../infrastructure/persistence/entities/tipo-recomendacion.entity";

@Injectable()
export class RecommendationTypesService {
  constructor(
    @InjectRepository(TipoRecomendacionEntity)
    private readonly tiposRecomendacionRepository: Repository<TipoRecomendacionEntity>
  ) {}

  async findAll() {
    const recommendationTypes = await this.tiposRecomendacionRepository.find({
      order: {
        name: "ASC"
      },
      take: 500
    });

    return createSuccessResponse(
      recommendationTypes.map((recommendationType) => ({
        id: recommendationType.id,
        name: recommendationType.name,
        isActive: recommendationType.isActive
      })),
      {
        count: recommendationTypes.length
      }
    );
  }
}
