import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
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

  async findAllProducts() {
    const products = await this.productosRepository.find({
      order: {
        name: "ASC"
      },
      take: 500
    });

    return createSuccessResponse(
      products.map((product) => ({
        id: product.id,
        name: product.name,
        isActive: product.isActive
      })),
      {
        count: products.length
      }
    );
  }

  async findAllApplicationFrequencies() {
    const applicationFrequencies =
      await this.frecuenciasAplicacionRepository.find({
        order: {
          name: "ASC"
        },
        take: 500
      });

    return createSuccessResponse(
      applicationFrequencies.map((applicationFrequency) => ({
        id: applicationFrequency.id,
        name: applicationFrequency.name,
        intervalDays: applicationFrequency.intervalDays,
        isActive: applicationFrequency.isActive
      })),
      {
        count: applicationFrequencies.length
      }
    );
  }
}
