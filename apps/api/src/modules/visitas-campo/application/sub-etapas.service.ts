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
import { EtapaFenologicaEntity } from "../infrastructure/persistence/entities/etapa-fenologica.entity";
import { SubEtapaEntity } from "../infrastructure/persistence/entities/sub-etapa.entity";
import { CreateSubEtapaDto } from "../presentation/dto/create-sub-etapa.dto";
import { FindSubEtapasQueryDto } from "../presentation/dto/find-sub-etapas-query.dto";
import { UpdateSubEtapaDto } from "../presentation/dto/update-sub-etapa.dto";

@Injectable()
export class SubEtapasService {
  constructor(
    @InjectRepository(SubEtapaEntity)
    private readonly subEtapasRepository: Repository<SubEtapaEntity>,
    @InjectRepository(EtapaFenologicaEntity)
    private readonly etapasFenologicasRepository: Repository<EtapaFenologicaEntity>
  ) {}

  async create(createSubEtapaDto: CreateSubEtapaDto) {
    await this.ensureEtapaFenologicaIsStage(
      createSubEtapaDto.etapaFenologicaId
    );

    const subEtapa = this.subEtapasRepository.create({
      etapaFenologicaId: createSubEtapaDto.etapaFenologicaId,
      name: createSubEtapaDto.name,
      sortOrder: createSubEtapaDto.sortOrder,
      description: createSubEtapaDto.description ?? null,
      percentage:
        createSubEtapaDto.percentage === undefined
          ? null
          : createSubEtapaDto.percentage,
      isActive: createSubEtapaDto.isActive ?? true
    });

    try {
      const savedSubEtapa = await this.subEtapasRepository.save(subEtapa);

      return createSuccessResponse(this.toResponse(savedSubEtapa));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findAll(query: FindSubEtapasQueryDto, pagination: PaginationQueryDto) {
    const where: FindOptionsWhere<SubEtapaEntity> = {};

    if (query.etapa_fenologica_id !== undefined) {
      where.etapaFenologicaId = query.etapa_fenologica_id;
    }

    if (query.estado !== undefined) {
      where.isActive = query.estado;
    }

    const [subEtapas, total] = await this.subEtapasRepository.findAndCount({
      where,
      order: {
        etapaFenologicaId: "ASC",
        sortOrder: "ASC",
        name: "ASC"
      },
      skip: pagination.skip,
      take: pagination.take
    });

    return createSuccessResponse(
      subEtapas.map((subEtapa) => this.toResponse(subEtapa)),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }

  async findById(id: string) {
    const subEtapa = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(subEtapa));
  }

  async update(id: string, updateSubEtapaDto: UpdateSubEtapaDto) {
    const subEtapa = await this.findEntityById(id);

    if (updateSubEtapaDto.etapaFenologicaId !== undefined) {
      await this.ensureEtapaFenologicaIsStage(
        updateSubEtapaDto.etapaFenologicaId
      );
    }

    const updatedSubEtapa = this.subEtapasRepository.merge(subEtapa, {
      ...(updateSubEtapaDto.etapaFenologicaId !== undefined
        ? { etapaFenologicaId: updateSubEtapaDto.etapaFenologicaId }
        : {}),
      ...(updateSubEtapaDto.name !== undefined
        ? { name: updateSubEtapaDto.name }
        : {}),
      ...(updateSubEtapaDto.sortOrder !== undefined
        ? { sortOrder: updateSubEtapaDto.sortOrder }
        : {}),
      ...(updateSubEtapaDto.description !== undefined
        ? { description: updateSubEtapaDto.description }
        : {}),
      ...(updateSubEtapaDto.percentage !== undefined
        ? { percentage: updateSubEtapaDto.percentage }
        : {}),
      ...(updateSubEtapaDto.isActive !== undefined
        ? { isActive: updateSubEtapaDto.isActive }
        : {})
    });

    try {
      const savedSubEtapa =
        await this.subEtapasRepository.save(updatedSubEtapa);

      return createSuccessResponse(this.toResponse(savedSubEtapa));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string) {
    const subEtapa = await this.findEntityById(id);

    if (!subEtapa.isActive) {
      return createSuccessResponse(this.toResponse(subEtapa));
    }

    subEtapa.isActive = false;

    const savedSubEtapa = await this.subEtapasRepository.save(subEtapa);

    return createSuccessResponse(this.toResponse(savedSubEtapa));
  }

  private async ensureEtapaFenologicaIsStage(etapaFenologicaId: string) {
    const etapaFenologica = await this.etapasFenologicasRepository.findOne({
      where: { id: etapaFenologicaId }
    });

    if (!etapaFenologica) {
      throw new BadRequestException("Etapa fenologica not found.");
    }

    if (etapaFenologica.type !== "Etapa") {
      throw new BadRequestException(
        "Sub etapas can only be linked to phenological stages of type Etapa."
      );
    }
  }

  private async findEntityById(id: string) {
    const subEtapa = await this.subEtapasRepository.findOne({
      where: { id }
    });

    if (!subEtapa) {
      throw new NotFoundException("Sub etapa not found.");
    }

    return subEtapa;
  }

  private handlePersistenceError(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const databaseError = error.driverError as
        | {
            code?: string;
            constraint?: string;
          }
        | undefined;

      if (databaseError?.code === "23505") {
        if (databaseError.constraint === "sub_etapas_etapa_orden_key") {
          throw new ConflictException(
            "A sub stage with the same sort order already exists for the stage."
          );
        }

        if (databaseError.constraint === "sub_etapas_etapa_nombre_key") {
          throw new ConflictException(
            "A sub stage with the same name already exists for the stage."
          );
        }
      }

      if (
        databaseError?.code === "23503" &&
        databaseError.constraint === "sub_etapas_etapa_fenologica_id_fkey"
      ) {
        throw new BadRequestException("Etapa fenologica not found.");
      }

      if (
        databaseError?.code === "23514" &&
        databaseError.constraint === "sub_etapas_porcentaje_check"
      ) {
        throw new BadRequestException(
          "Percentage must be between 0 and 100."
        );
      }
    }

    throw error;
  }

  private toResponse(subEtapa: SubEtapaEntity) {
    return {
      id: subEtapa.id,
      etapaFenologicaId: subEtapa.etapaFenologicaId,
      name: subEtapa.name,
      sortOrder: subEtapa.sortOrder,
      description: subEtapa.description,
      percentage:
        subEtapa.percentage === null ? null : Number(subEtapa.percentage),
      isActive: subEtapa.isActive
    };
  }
}
