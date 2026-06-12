import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import {
  createPaginatedMeta,
  createSuccessResponse
} from "../../../common/http/api-response";
import { CultivoEntity } from "../../cultivos/infrastructure/persistence/entities/cultivo.entity";
import { DetalleNutrienteEntity } from "../infrastructure/persistence/entities/detalle-nutriente.entity";
import { NutrienteEntity } from "../infrastructure/persistence/entities/nutriente.entity";
import { CreateDetalleNutrienteDto } from "../presentation/dto/create-detalle-nutriente.dto";
import { CreateNutrienteDto } from "../presentation/dto/create-nutriente.dto";
import { UpdateDetalleNutrienteDto } from "../presentation/dto/update-detalle-nutriente.dto";
import { UpdateNutrienteDto } from "../presentation/dto/update-nutriente.dto";

@Injectable()
export class NutritionCatalogsService {
  constructor(
    @InjectRepository(NutrienteEntity)
    private readonly nutrientesRepository: Repository<NutrienteEntity>,
    @InjectRepository(DetalleNutrienteEntity)
    private readonly detallesRepository: Repository<DetalleNutrienteEntity>,
    @InjectRepository(CultivoEntity)
    private readonly cultivosRepository: Repository<CultivoEntity>
  ) {}

  async findAllNutrients(pagination: PaginationQueryDto) {
    const [nutrients, total] = await this.nutrientesRepository.findAndCount({
      relations: {
        cultivo: true,
        details: true
      },
      order: {
        cultivoId: "ASC",
        name: "ASC",
        details: {
          name: "ASC"
        }
      },
      skip: pagination.skip,
      take: pagination.take
    });

    return createSuccessResponse(
      nutrients.map((nutrient) => this.toNutrientResponse(nutrient)),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }

  async findNutrientById(id: string) {
    const nutrient = await this.findNutrientEntityById(id);

    return createSuccessResponse(this.toNutrientResponse(nutrient));
  }

  async createNutrient(createDto: CreateNutrienteDto) {
    await this.ensureCropExists(createDto.cultivoId);

    const nutrient = this.nutrientesRepository.create({
      cultivoId: createDto.cultivoId,
      name: createDto.name,
      description: createDto.description ?? null,
      isActive: createDto.isActive ?? true
    });

    try {
      const savedNutrient = await this.nutrientesRepository.save(nutrient);

      return createSuccessResponse(
        this.toNutrientResponse(await this.findNutrientEntityById(savedNutrient.id))
      );
    } catch (error) {
      this.handleNutrientPersistenceError(error, "save");
    }
  }

  async updateNutrient(id: string, updateDto: UpdateNutrienteDto) {
    const nutrient = await this.findNutrientEntityById(id);

    if (updateDto.cultivoId !== undefined) {
      await this.ensureCropExists(updateDto.cultivoId);
    }

    const updatedNutrient = this.nutrientesRepository.merge(nutrient, {
      ...(updateDto.cultivoId !== undefined ? { cultivoId: updateDto.cultivoId } : {}),
      ...(updateDto.name !== undefined ? { name: updateDto.name } : {}),
      ...(updateDto.description !== undefined
        ? { description: updateDto.description }
        : {}),
      ...(updateDto.isActive !== undefined ? { isActive: updateDto.isActive } : {})
    });

    try {
      const savedNutrient = await this.nutrientesRepository.save(updatedNutrient);

      return createSuccessResponse(
        this.toNutrientResponse(await this.findNutrientEntityById(savedNutrient.id))
      );
    } catch (error) {
      this.handleNutrientPersistenceError(error, "save");
    }
  }

  async removeNutrient(id: string) {
    const nutrient = await this.findNutrientEntityById(id);

    if (!nutrient.isActive) {
      return createSuccessResponse(this.toNutrientResponse(nutrient));
    }

    nutrient.isActive = false;

    const savedNutrient = await this.nutrientesRepository.save(nutrient);

    return createSuccessResponse(
      this.toNutrientResponse(await this.findNutrientEntityById(savedNutrient.id))
    );
  }

  async findAllDetails(pagination: PaginationQueryDto) {
    const [details, total] = await this.detallesRepository.findAndCount({
      relations: {
        nutriente: {
          cultivo: true
        }
      },
      order: {
        nutrientId: "ASC",
        name: "ASC"
      },
      skip: pagination.skip,
      take: pagination.take
    });

    return createSuccessResponse(
      details.map((detail) => this.toDetailResponse(detail)),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }

  async findDetailById(id: string) {
    const detail = await this.findDetailEntityById(id);

    return createSuccessResponse(this.toDetailResponse(detail));
  }

  async createDetail(createDto: CreateDetalleNutrienteDto) {
    await this.ensureNutrientExists(createDto.nutrientId);

    const detail = this.detallesRepository.create({
      nutrientId: createDto.nutrientId,
      name: createDto.name,
      description: createDto.description ?? null,
      isActive: createDto.isActive ?? true
    });

    try {
      const savedDetail = await this.detallesRepository.save(detail);

      return createSuccessResponse(
        this.toDetailResponse(await this.findDetailEntityById(savedDetail.id))
      );
    } catch (error) {
      this.handleDetailPersistenceError(error, "save");
    }
  }

  async updateDetail(id: string, updateDto: UpdateDetalleNutrienteDto) {
    const detail = await this.findDetailEntityById(id);

    if (updateDto.nutrientId !== undefined) {
      await this.ensureNutrientExists(updateDto.nutrientId);
    }

    const updatedDetail = this.detallesRepository.merge(detail, {
      ...(updateDto.nutrientId !== undefined ? { nutrientId: updateDto.nutrientId } : {}),
      ...(updateDto.name !== undefined ? { name: updateDto.name } : {}),
      ...(updateDto.description !== undefined
        ? { description: updateDto.description }
        : {}),
      ...(updateDto.isActive !== undefined ? { isActive: updateDto.isActive } : {})
    });

    try {
      const savedDetail = await this.detallesRepository.save(updatedDetail);

      return createSuccessResponse(
        this.toDetailResponse(await this.findDetailEntityById(savedDetail.id))
      );
    } catch (error) {
      this.handleDetailPersistenceError(error, "save");
    }
  }

  async removeDetail(id: string) {
    const detail = await this.findDetailEntityById(id);

    if (!detail.isActive) {
      return createSuccessResponse(this.toDetailResponse(detail));
    }

    detail.isActive = false;

    const savedDetail = await this.detallesRepository.save(detail);

    return createSuccessResponse(
      this.toDetailResponse(await this.findDetailEntityById(savedDetail.id))
    );
  }

  private async findNutrientEntityById(id: string) {
    const nutrient = await this.nutrientesRepository.findOne({
      where: { id },
      relations: {
        cultivo: true,
        details: true
      },
      order: {
        details: {
          name: "ASC"
        }
      }
    });

    if (!nutrient) {
      throw new NotFoundException("Nutrient not found.");
    }

    return nutrient;
  }

  private async findDetailEntityById(id: string) {
    const detail = await this.detallesRepository.findOne({
      where: { id },
      relations: {
        nutriente: {
          cultivo: true
        }
      }
    });

    if (!detail) {
      throw new NotFoundException("Nutrient detail not found.");
    }

    return detail;
  }

  private async ensureCropExists(cultivoId: string) {
    const crop = await this.cultivosRepository.findOne({
      where: { id: cultivoId }
    });

    if (!crop) {
      throw new BadRequestException("Crop not found.");
    }
  }

  private async ensureNutrientExists(nutrientId: string) {
    const nutrient = await this.nutrientesRepository.findOne({
      where: { id: nutrientId }
    });

    if (!nutrient) {
      throw new BadRequestException("Nutrient not found.");
    }
  }

  private handleNutrientPersistenceError(error: unknown, operation: "save"): never {
    if (error instanceof QueryFailedError) {
      const databaseError = error.driverError as
        | {
            code?: string;
            constraint?: string;
          }
        | undefined;

      if (
        operation === "save" &&
        databaseError?.code === "23505" &&
        databaseError.constraint === "nutrientes_cultivo_nombre_key"
      ) {
        throw new ConflictException(
          "A nutrient with the same crop and name already exists."
        );
      }

      if (
        operation === "save" &&
        databaseError?.code === "23503" &&
        databaseError.constraint === "nutrientes_cultivo_fkey"
      ) {
        throw new BadRequestException("Crop not found.");
      }
    }

    throw error;
  }

  private handleDetailPersistenceError(error: unknown, operation: "save"): never {
    if (error instanceof QueryFailedError) {
      const databaseError = error.driverError as
        | {
            code?: string;
            constraint?: string;
          }
        | undefined;

      if (
        operation === "save" &&
        databaseError?.code === "23505" &&
        databaseError.constraint === "detalle_nutrientes_nutriente_nombre_key"
      ) {
        throw new ConflictException(
          "A nutrient detail with the same nutrient and name already exists."
        );
      }

      if (
        operation === "save" &&
        databaseError?.code === "23503" &&
        databaseError.constraint === "detalle_nutrientes_nutriente_fkey"
      ) {
        throw new BadRequestException("Nutrient not found.");
      }
    }

    throw error;
  }

  private toNutrientResponse(nutrient: NutrienteEntity) {
    return {
      id: nutrient.id,
      cultivoId: nutrient.cultivoId,
      name: nutrient.name,
      description: nutrient.description,
      isActive: nutrient.isActive,
      createdAt: nutrient.createdAt,
      updatedAt: nutrient.updatedAt,
      cultivo: nutrient.cultivo
        ? {
            id: nutrient.cultivo.id,
            code: nutrient.cultivo.code,
            name: nutrient.cultivo.name,
            isActive: nutrient.cultivo.isActive
          }
        : null,
      details: nutrient.details?.map((detail) => this.toDetailResponse(detail)) ?? []
    };
  }

  private toDetailResponse(detail: DetalleNutrienteEntity) {
    return {
      id: detail.id,
      nutrientId: detail.nutrientId,
      name: detail.name,
      description: detail.description,
      isActive: detail.isActive,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
      nutrient: detail.nutriente
        ? {
            id: detail.nutriente.id,
            cultivoId: detail.nutriente.cultivoId,
            name: detail.nutriente.name,
            description: detail.nutriente.description,
            isActive: detail.nutriente.isActive,
            cultivo: detail.nutriente.cultivo
              ? {
                  id: detail.nutriente.cultivo.id,
                  code: detail.nutriente.cultivo.code,
                  name: detail.nutriente.cultivo.name,
                  isActive: detail.nutriente.cultivo.isActive
                }
              : null
          }
        : null
    };
  }
}
