import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { VariedadEntity } from "../infrastructure/persistence/entities/variedad.entity";

@Injectable()
export class VariedadesService {
  constructor(
    @InjectRepository(VariedadEntity)
    private readonly variedadesRepository: Repository<VariedadEntity>
  ) {}

  async findAll() {
    const variedades = await this.variedadesRepository.find({
      order: {
        cultivoId: "ASC",
        name: "ASC"
      },
      take: 500
    });

    return createSuccessResponse(
      variedades.map((variedad) => this.toResponse(variedad)),
      {
        count: variedades.length
      }
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
