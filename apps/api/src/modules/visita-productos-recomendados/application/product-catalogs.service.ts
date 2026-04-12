import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import {
  createPaginatedMeta,
  createSuccessResponse
} from "../../../common/http/api-response";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { FrecuenciaAplicacionEntity } from "../infrastructure/persistence/entities/frecuencia-aplicacion.entity";
import { ProductoEntity } from "../infrastructure/persistence/entities/producto.entity";

@Injectable()
export class ProductCatalogsService {
  constructor(
    @InjectRepository(ProductoEntity)
    private readonly productosRepository: Repository<ProductoEntity>,
    @InjectRepository(FrecuenciaAplicacionEntity)
    private readonly frecuenciasAplicacionRepository: Repository<FrecuenciaAplicacionEntity>
  ) {}

  async findAllProducts(pagination: PaginationQueryDto) {
    const [products, total] = await this.productosRepository.findAndCount({
      order: {
        name: "ASC"
      },
      skip: pagination.skip,
      take: pagination.take
    });

    return createSuccessResponse(
      products.map((product) => ({
        id: product.id,
        name: product.name,
        isActive: product.isActive
      })),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }

  async findAllApplicationFrequencies(pagination: PaginationQueryDto) {
    const [applicationFrequencies, total] =
      await this.frecuenciasAplicacionRepository.findAndCount({
        order: {
          name: "ASC"
        },
        skip: pagination.skip,
        take: pagination.take
      });

    return createSuccessResponse(
      applicationFrequencies.map((applicationFrequency) => ({
        id: applicationFrequency.id,
        name: applicationFrequency.name,
        intervalDays: applicationFrequency.intervalDays,
        isActive: applicationFrequency.isActive
      })),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }
}
