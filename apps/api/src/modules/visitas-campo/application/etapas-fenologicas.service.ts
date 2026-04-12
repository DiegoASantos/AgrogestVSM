import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { FindOptionsWhere } from "typeorm";
import { QueryFailedError, Repository } from "typeorm";

import {
  createPaginatedMeta,
  createSuccessResponse
} from "../../../common/http/api-response";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { CultivoEntity } from "../../cultivos/infrastructure/persistence/entities/cultivo.entity";
import { EtapaFenologicaEntity } from "../infrastructure/persistence/entities/etapa-fenologica.entity";
import { CreateEtapaFenologicaDto } from "../presentation/dto/create-etapa-fenologica.dto";
import { FindEtapasFenologicasQueryDto } from "../presentation/dto/find-etapas-fenologicas-query.dto";
import { UpdateEtapaFenologicaDto } from "../presentation/dto/update-etapa-fenologica.dto";

@Injectable()
export class EtapasFenologicasService {
  constructor(
    @InjectRepository(EtapaFenologicaEntity)
    private readonly etapasFenologicasRepository: Repository<EtapaFenologicaEntity>,
    @InjectRepository(CultivoEntity)
    private readonly cultivosRepository: Repository<CultivoEntity>
  ) {}

  async create(createEtapaFenologicaDto: CreateEtapaFenologicaDto) {
    await this.ensureCultivoExists(createEtapaFenologicaDto.cultivoId);

    const etapaFenologica = this.etapasFenologicasRepository.create({
      cultivoId: createEtapaFenologicaDto.cultivoId,
      name: createEtapaFenologicaDto.name,
      description: createEtapaFenologicaDto.description ?? null,
      isActive: createEtapaFenologicaDto.isActive ?? true
    });

    try {
      const savedEtapaFenologica =
        await this.etapasFenologicasRepository.save(etapaFenologica);

      return createSuccessResponse(this.toResponse(savedEtapaFenologica));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findAll(
    query: FindEtapasFenologicasQueryDto,
    pagination: PaginationQueryDto
  ) {
    const where: FindOptionsWhere<EtapaFenologicaEntity> = {};

    if (query.cultivo_id !== undefined) {
      where.cultivoId = query.cultivo_id;
    }

    if (query.activa !== undefined) {
      where.isActive = query.activa;
    }

    const [etapasFenologicas, total] =
      await this.etapasFenologicasRepository.findAndCount({
        where,
        order: {
          cultivoId: "ASC",
          name: "ASC"
        },
        skip: pagination.skip,
        take: pagination.take
      });

    return createSuccessResponse(
      etapasFenologicas.map((etapaFenologica) =>
        this.toResponse(etapaFenologica)
      ),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }

  async findById(id: string) {
    const etapaFenologica = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(etapaFenologica));
  }

  async update(id: string, updateEtapaFenologicaDto: UpdateEtapaFenologicaDto) {
    const etapaFenologica = await this.findEntityById(id);

    if (updateEtapaFenologicaDto.cultivoId !== undefined) {
      await this.ensureCultivoExists(updateEtapaFenologicaDto.cultivoId);
    }

    const updatedEtapaFenologica = this.etapasFenologicasRepository.merge(
      etapaFenologica,
      {
        ...(updateEtapaFenologicaDto.cultivoId !== undefined
          ? { cultivoId: updateEtapaFenologicaDto.cultivoId }
          : {}),
        ...(updateEtapaFenologicaDto.name !== undefined
          ? { name: updateEtapaFenologicaDto.name }
          : {}),
        ...(updateEtapaFenologicaDto.description !== undefined
          ? { description: updateEtapaFenologicaDto.description }
          : {}),
        ...(updateEtapaFenologicaDto.isActive !== undefined
          ? { isActive: updateEtapaFenologicaDto.isActive }
          : {})
      }
    );

    try {
      const savedEtapaFenologica = await this.etapasFenologicasRepository.save(
        updatedEtapaFenologica
      );

      return createSuccessResponse(this.toResponse(savedEtapaFenologica));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string) {
    const etapaFenologica = await this.findEntityById(id);

    if (!etapaFenologica.isActive) {
      return createSuccessResponse(this.toResponse(etapaFenologica));
    }

    etapaFenologica.isActive = false;

    const savedEtapaFenologica =
      await this.etapasFenologicasRepository.save(etapaFenologica);

    return createSuccessResponse(this.toResponse(savedEtapaFenologica));
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
    const etapaFenologica = await this.etapasFenologicasRepository.findOne({
      where: { id }
    });

    if (!etapaFenologica) {
      throw new NotFoundException("Etapa fenologica not found.");
    }

    return etapaFenologica;
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
        databaseError.constraint ===
          "etapas_fenologicas_cultivo_id_nombre_key"
      ) {
        throw new ConflictException(
          "A phenological stage with the same name already exists for the crop."
        );
      }

      if (
        databaseError?.code === "23503" &&
        databaseError.constraint === "etapas_fenologicas_cultivo_id_fkey"
      ) {
        throw new BadRequestException("Cultivo not found.");
      }
    }

    throw error;
  }

  private toResponse(etapaFenologica: EtapaFenologicaEntity) {
    return {
      id: etapaFenologica.id,
      cultivoId: etapaFenologica.cultivoId,
      name: etapaFenologica.name,
      description: etapaFenologica.description,
      isActive: etapaFenologica.isActive
    };
  }
}
