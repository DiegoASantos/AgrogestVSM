import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { FindOptionsWhere } from "typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { CultivoEntity } from "../../cultivos/infrastructure/persistence/entities/cultivo.entity";
import { FindCampaniasQueryDto } from "../presentation/dto/find-campanias-query.dto";
import { CampaniaEntity } from "../infrastructure/persistence/entities/campania.entity";
import { CreateCampaniaDto } from "../presentation/dto/create-campania.dto";
import { UpdateCampaniaDto } from "../presentation/dto/update-campania.dto";

@Injectable()
export class CampaniasService {
  constructor(
    @InjectRepository(CampaniaEntity)
    private readonly campaniasRepository: Repository<CampaniaEntity>,
    @InjectRepository(CultivoEntity)
    private readonly cultivosRepository: Repository<CultivoEntity>
  ) {}

  async create(createCampaniaDto: CreateCampaniaDto) {
    await this.ensureCultivoExists(createCampaniaDto.cultivoId);

    const campania = this.campaniasRepository.create({
      name: createCampaniaDto.name,
      cultivoId: createCampaniaDto.cultivoId,
      startDate: createCampaniaDto.startDate,
      endDate: createCampaniaDto.endDate ?? null,
      description: createCampaniaDto.description ?? null,
      isActive: createCampaniaDto.isActive ?? true
    });

    try {
      const savedCampania = await this.campaniasRepository.save(campania);

      return createSuccessResponse(this.toResponse(savedCampania));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findAll(query: FindCampaniasQueryDto) {
    const where: FindOptionsWhere<CampaniaEntity> = {};

    if (query.cultivo_id !== undefined) {
      where.cultivoId = query.cultivo_id;
    }

    if (query.activa !== undefined) {
      where.isActive = query.activa;
    }

    const campanias = await this.campaniasRepository.find({
      where,
      order: {
        startDate: "DESC",
        name: "ASC"
      },
      take: 500
    });

    return createSuccessResponse(
      campanias.map((campania) => this.toResponse(campania)),
      {
        count: campanias.length
      }
    );
  }

  async findById(id: string) {
    const campania = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(campania));
  }

  async update(id: string, updateCampaniaDto: UpdateCampaniaDto) {
    const campania = await this.findEntityById(id);

    if (updateCampaniaDto.cultivoId !== undefined) {
      await this.ensureCultivoExists(updateCampaniaDto.cultivoId);
    }

    const updatedCampania = this.campaniasRepository.merge(campania, {
      ...(updateCampaniaDto.name !== undefined
        ? { name: updateCampaniaDto.name }
        : {}),
      ...(updateCampaniaDto.cultivoId !== undefined
        ? { cultivoId: updateCampaniaDto.cultivoId }
        : {}),
      ...(updateCampaniaDto.startDate !== undefined
        ? { startDate: updateCampaniaDto.startDate }
        : {}),
      ...(updateCampaniaDto.endDate !== undefined
        ? { endDate: updateCampaniaDto.endDate }
        : {}),
      ...(updateCampaniaDto.description !== undefined
        ? { description: updateCampaniaDto.description }
        : {}),
      ...(updateCampaniaDto.isActive !== undefined
        ? { isActive: updateCampaniaDto.isActive }
        : {}),
      updatedAt: new Date()
    });

    try {
      const savedCampania = await this.campaniasRepository.save(
        updatedCampania
      );

      return createSuccessResponse(this.toResponse(savedCampania));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string) {
    const campania = await this.findEntityById(id);

    if (!campania.isActive) {
      return createSuccessResponse(this.toResponse(campania));
    }

    campania.isActive = false;
    campania.updatedAt = new Date();

    const savedCampania = await this.campaniasRepository.save(campania);

    return createSuccessResponse(this.toResponse(savedCampania));
  }

  private async ensureCultivoExists(cultivoId: string) {
    const cultivo = await this.cultivosRepository.findOne({
      where: { id: cultivoId }
    });

    if (!cultivo) {
      throw new BadRequestException("Cultivo not found.");
    }
  }

  private async findEntityById(id: string) {
    const campania = await this.campaniasRepository.findOne({
      where: { id }
    });

    if (!campania) {
      throw new NotFoundException("Campania not found.");
    }

    return campania;
  }

  private handlePersistenceError(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const databaseError = error.driverError as
        | {
            code?: string;
            constraint?: string;
          }
        | undefined;

      if (
        databaseError?.code === "23505" &&
        databaseError.constraint === "campanias_nombre_key"
      ) {
        throw new ConflictException(
          "A campaign with the same name already exists."
        );
      }

      if (
        databaseError?.code === "23503" &&
        databaseError.constraint === "campanias_cultivo_id_fkey"
      ) {
        throw new BadRequestException("Cultivo not found.");
      }
    }

    throw error;
  }

  private toResponse(campania: CampaniaEntity) {
    return {
      id: campania.id,
      name: campania.name,
      cultivoId: campania.cultivoId,
      startDate: campania.startDate,
      endDate: campania.endDate,
      description: campania.description,
      isActive: campania.isActive,
      createdAt: campania.createdAt,
      updatedAt: campania.updatedAt
    };
  }
}
