import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import {
  createPaginatedMeta,
  createSuccessResponse
} from "../../../common/http/api-response";
import { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { EtapaFenologicaEntity } from "../../visitas-campo/infrastructure/persistence/entities/etapa-fenologica.entity";
import { NivelIncidenciaEntity } from "../infrastructure/persistence/entities/nivel-incidencia.entity";
import { PlagaEnfermedadEtapaNivelEntity } from "../infrastructure/persistence/entities/plaga-enfermedad-etapa-nivel.entity";
import { PlagaEnfermedadEntity } from "../infrastructure/persistence/entities/plaga-enfermedad.entity";
import { CreatePlagaEnfermedadEtapaNivelDto } from "../presentation/dto/create-plaga-enfermedad-etapa-nivel.dto";
import { CreateNivelIncidenciaDto } from "../presentation/dto/create-nivel-incidencia.dto";
import { CreatePlagaEnfermedadDto } from "../presentation/dto/create-plaga-enfermedad.dto";
import { UpdateNivelIncidenciaDto } from "../presentation/dto/update-nivel-incidencia.dto";
import { UpdatePlagaEnfermedadEtapaNivelDto } from "../presentation/dto/update-plaga-enfermedad-etapa-nivel.dto";
import { UpdatePlagaEnfermedadDto } from "../presentation/dto/update-plaga-enfermedad.dto";

@Injectable()
export class SanitaryCatalogsService {
  constructor(
    @InjectRepository(PlagaEnfermedadEntity)
    private readonly plagasEnfermedadesRepository: Repository<PlagaEnfermedadEntity>,
    @InjectRepository(NivelIncidenciaEntity)
    private readonly nivelesIncidenciaRepository: Repository<NivelIncidenciaEntity>,
    @InjectRepository(PlagaEnfermedadEtapaNivelEntity)
    private readonly plagasEnfermedadesEtapasNivelesRepository: Repository<PlagaEnfermedadEtapaNivelEntity>,
    @InjectRepository(EtapaFenologicaEntity)
    private readonly etapasFenologicasRepository: Repository<EtapaFenologicaEntity>
  ) {}

  async findAllPestDiseases(pagination: PaginationQueryDto) {
    const [pestDiseases, total] =
      await this.plagasEnfermedadesRepository.findAndCount({
        order: {
          type: "ASC",
          name: "ASC"
        },
        skip: pagination.skip,
        take: pagination.take
      });

    return createSuccessResponse(
      pestDiseases.map((pestDisease) => this.toPestDiseaseResponse(pestDisease)),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }

  async findPestDiseaseById(id: string) {
    const pestDisease = await this.findPestDiseaseEntityById(id);

    return createSuccessResponse(this.toPestDiseaseResponse(pestDisease));
  }

  async createPestDisease(createPlagaEnfermedadDto: CreatePlagaEnfermedadDto) {
    const pestDisease = this.plagasEnfermedadesRepository.create({
      scientificName: createPlagaEnfermedadDto.scientificName ?? null,
      name: createPlagaEnfermedadDto.name,
      type: createPlagaEnfermedadDto.type,
      isActive: createPlagaEnfermedadDto.isActive ?? true
    });

    try {
      const savedPestDisease =
        await this.plagasEnfermedadesRepository.save(pestDisease);

      return createSuccessResponse(this.toPestDiseaseResponse(savedPestDisease));
    } catch (error) {
      this.handlePestDiseasePersistenceError(error, "save");
    }
  }

  async updatePestDisease(
    id: string,
    updatePlagaEnfermedadDto: UpdatePlagaEnfermedadDto
  ) {
    const pestDisease = await this.findPestDiseaseEntityById(id);

    const updatedPestDisease = this.plagasEnfermedadesRepository.merge(
      pestDisease,
      {
        ...(updatePlagaEnfermedadDto.scientificName !== undefined
          ? { scientificName: updatePlagaEnfermedadDto.scientificName }
          : {}),
        ...(updatePlagaEnfermedadDto.name !== undefined
          ? { name: updatePlagaEnfermedadDto.name }
          : {}),
        ...(updatePlagaEnfermedadDto.type !== undefined
          ? { type: updatePlagaEnfermedadDto.type }
          : {}),
        ...(updatePlagaEnfermedadDto.isActive !== undefined
          ? { isActive: updatePlagaEnfermedadDto.isActive }
          : {})
      }
    );

    try {
      const savedPestDisease = await this.plagasEnfermedadesRepository.save(
        updatedPestDisease
      );

      return createSuccessResponse(this.toPestDiseaseResponse(savedPestDisease));
    } catch (error) {
      this.handlePestDiseasePersistenceError(error, "save");
    }
  }

  async removePestDisease(id: string) {
    const pestDisease = await this.findPestDiseaseEntityById(id);

    if (!pestDisease.isActive) {
      return createSuccessResponse(this.toPestDiseaseResponse(pestDisease));
    }

    pestDisease.isActive = false;

    const savedPestDisease =
      await this.plagasEnfermedadesRepository.save(pestDisease);

    return createSuccessResponse(this.toPestDiseaseResponse(savedPestDisease));
  }

  async findAllPestDiseaseStageLevels(pagination: PaginationQueryDto) {
    const [items, total] =
      await this.plagasEnfermedadesEtapasNivelesRepository.findAndCount({
        relations: {
          plagaEnfermedad: true,
          etapaFenologica: true,
          nivelIncidenciaSeveridad: true
        },
        order: {
          plagaEnfermedadId: "ASC",
          etapaFenologicaId: "ASC",
          nivelIncidenciaSeveridadId: "ASC"
        },
        skip: pagination.skip,
        take: pagination.take
      });

    return createSuccessResponse(
      items.map((item) => this.toPestDiseaseStageLevelResponse(item)),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }

  async findPestDiseaseStageLevelById(id: string) {
    const item = await this.findPestDiseaseStageLevelEntityById(id);

    return createSuccessResponse(this.toPestDiseaseStageLevelResponse(item));
  }

  async createPestDiseaseStageLevel(
    createDto: CreatePlagaEnfermedadEtapaNivelDto
  ) {
    await this.ensurePestDiseaseExists(createDto.plagaEnfermedadId);
    await this.ensureEtapaFenologicaExists(createDto.etapaFenologicaId);
    await this.ensureIncidenceLevelExists(
      createDto.nivelIncidenciaSeveridadId
    );

    const item = this.plagasEnfermedadesEtapasNivelesRepository.create({
      plagaEnfermedadId: createDto.plagaEnfermedadId,
      etapaFenologicaId: createDto.etapaFenologicaId,
      nivelIncidenciaSeveridadId: createDto.nivelIncidenciaSeveridadId,
      description: createDto.description ?? null,
      isActive: createDto.isActive ?? true
    });

    try {
      const savedItem =
        await this.plagasEnfermedadesEtapasNivelesRepository.save(item);

      return createSuccessResponse(
        this.toPestDiseaseStageLevelResponse(
          await this.findPestDiseaseStageLevelEntityById(savedItem.id)
        )
      );
    } catch (error) {
      this.handlePestDiseaseStageLevelPersistenceError(error, "save");
    }
  }

  async updatePestDiseaseStageLevel(
    id: string,
    updateDto: UpdatePlagaEnfermedadEtapaNivelDto
  ) {
    const item = await this.findPestDiseaseStageLevelEntityById(id);

    if (updateDto.plagaEnfermedadId !== undefined) {
      await this.ensurePestDiseaseExists(updateDto.plagaEnfermedadId);
    }

    if (updateDto.etapaFenologicaId !== undefined) {
      await this.ensureEtapaFenologicaExists(updateDto.etapaFenologicaId);
    }

    if (updateDto.nivelIncidenciaSeveridadId !== undefined) {
      await this.ensureIncidenceLevelExists(updateDto.nivelIncidenciaSeveridadId);
    }

    const updatedItem = this.plagasEnfermedadesEtapasNivelesRepository.merge(
      item,
      {
        ...(updateDto.plagaEnfermedadId !== undefined
          ? { plagaEnfermedadId: updateDto.plagaEnfermedadId }
          : {}),
        ...(updateDto.etapaFenologicaId !== undefined
          ? { etapaFenologicaId: updateDto.etapaFenologicaId }
          : {}),
        ...(updateDto.nivelIncidenciaSeveridadId !== undefined
          ? { nivelIncidenciaSeveridadId: updateDto.nivelIncidenciaSeveridadId }
          : {}),
        ...(updateDto.description !== undefined
          ? { description: updateDto.description }
          : {}),
        ...(updateDto.isActive !== undefined
          ? { isActive: updateDto.isActive }
          : {})
      }
    );

    try {
      const savedItem =
        await this.plagasEnfermedadesEtapasNivelesRepository.save(updatedItem);

      return createSuccessResponse(
        this.toPestDiseaseStageLevelResponse(
          await this.findPestDiseaseStageLevelEntityById(savedItem.id)
        )
      );
    } catch (error) {
      this.handlePestDiseaseStageLevelPersistenceError(error, "save");
    }
  }

  async removePestDiseaseStageLevel(id: string) {
    const item = await this.findPestDiseaseStageLevelEntityById(id);

    if (!item.isActive) {
      return createSuccessResponse(this.toPestDiseaseStageLevelResponse(item));
    }

    item.isActive = false;

    const savedItem =
      await this.plagasEnfermedadesEtapasNivelesRepository.save(item);

    return createSuccessResponse(
      this.toPestDiseaseStageLevelResponse(
        await this.findPestDiseaseStageLevelEntityById(savedItem.id)
      )
    );
  }

  async findAllIncidenceLevels(pagination: PaginationQueryDto) {
    const [incidenceLevels, total] =
      await this.nivelesIncidenciaRepository.findAndCount({
        order: {
          type: "ASC",
          sortOrder: "ASC",
          id: "ASC"
        },
        skip: pagination.skip,
        take: pagination.take
      });

    return createSuccessResponse(
      incidenceLevels.map((incidenceLevel) =>
        this.toIncidenceLevelResponse(incidenceLevel)
      ),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }

  async findIncidenceLevelById(id: string) {
    const incidenceLevel = await this.findIncidenceLevelEntityById(id);

    return createSuccessResponse(this.toIncidenceLevelResponse(incidenceLevel));
  }

  async createIncidenceLevel(
    createNivelIncidenciaDto: CreateNivelIncidenciaDto
  ) {
    const incidenceLevel = this.nivelesIncidenciaRepository.create({
      name: createNivelIncidenciaDto.name,
      sortOrder: createNivelIncidenciaDto.sortOrder,
      type: createNivelIncidenciaDto.type
    });

    try {
      const savedIncidenceLevel =
        await this.nivelesIncidenciaRepository.save(incidenceLevel);

      return createSuccessResponse(
        this.toIncidenceLevelResponse(savedIncidenceLevel)
      );
    } catch (error) {
      this.handleIncidenceLevelPersistenceError(error, "save");
    }
  }

  async updateIncidenceLevel(
    id: string,
    updateNivelIncidenciaDto: UpdateNivelIncidenciaDto
  ) {
    const incidenceLevel = await this.findIncidenceLevelEntityById(id);
    const updatedIncidenceLevel = this.nivelesIncidenciaRepository.merge(
      incidenceLevel,
      {
        ...(updateNivelIncidenciaDto.name !== undefined
          ? { name: updateNivelIncidenciaDto.name }
          : {}),
        ...(updateNivelIncidenciaDto.sortOrder !== undefined
          ? { sortOrder: updateNivelIncidenciaDto.sortOrder }
          : {}),
        ...(updateNivelIncidenciaDto.type !== undefined
          ? { type: updateNivelIncidenciaDto.type }
          : {})
      }
    );

    try {
      const savedIncidenceLevel = await this.nivelesIncidenciaRepository.save(
        updatedIncidenceLevel
      );

      return createSuccessResponse(
        this.toIncidenceLevelResponse(savedIncidenceLevel)
      );
    } catch (error) {
      this.handleIncidenceLevelPersistenceError(error, "save");
    }
  }

  async removeIncidenceLevel(id: string) {
    const incidenceLevel = await this.findIncidenceLevelEntityById(id);

    try {
      await this.nivelesIncidenciaRepository.remove(incidenceLevel);

      return createSuccessResponse(this.toIncidenceLevelResponse(incidenceLevel));
    } catch (error) {
      this.handleIncidenceLevelPersistenceError(error, "delete");
    }
  }

  private async findPestDiseaseEntityById(id: string) {
    const pestDisease = await this.plagasEnfermedadesRepository.findOne({
      where: { id }
    });

    if (!pestDisease) {
      throw new NotFoundException("Pest disease not found.");
    }

    return pestDisease;
  }

  private async findIncidenceLevelEntityById(id: string) {
    const incidenceLevel = await this.nivelesIncidenciaRepository.findOne({
      where: { id: Number(id) }
    });

    if (!incidenceLevel) {
      throw new NotFoundException("Incidence level not found.");
    }

    return incidenceLevel;
  }

  private async findPestDiseaseStageLevelEntityById(id: string) {
    const item =
      await this.plagasEnfermedadesEtapasNivelesRepository.findOne({
        where: { id },
        relations: {
          plagaEnfermedad: true,
          etapaFenologica: true,
          nivelIncidenciaSeveridad: true
        }
      });

    if (!item) {
      throw new NotFoundException("Pest disease stage level not found.");
    }

    return item;
  }

  private async ensurePestDiseaseExists(plagaEnfermedadId: string) {
    const pestDisease = await this.plagasEnfermedadesRepository.findOne({
      where: { id: plagaEnfermedadId }
    });

    if (!pestDisease) {
      throw new BadRequestException("Pest disease not found.");
    }
  }

  private async ensureEtapaFenologicaExists(etapaFenologicaId: string) {
    const etapaFenologica = await this.etapasFenologicasRepository.findOne({
      where: { id: etapaFenologicaId }
    });

    if (!etapaFenologica) {
      throw new BadRequestException("Phenological stage not found.");
    }
  }

  private async ensureIncidenceLevelExists(
    nivelIncidenciaSeveridadId: number
  ) {
    const incidenceLevel = await this.nivelesIncidenciaRepository.findOne({
      where: { id: nivelIncidenciaSeveridadId }
    });

    if (!incidenceLevel) {
      throw new BadRequestException("Incidence or severity level not found.");
    }
  }

  private handlePestDiseasePersistenceError(
    error: unknown,
    operation: "save"
  ): never {
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
        databaseError.constraint === "plagas_enfermedades_nombre_key"
      ) {
        throw new ConflictException(
          "A pest or disease with the same name already exists."
        );
      }

    }

    throw error;
  }

  private handlePestDiseaseStageLevelPersistenceError(
    error: unknown,
    operation: "save"
  ): never {
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
        databaseError.constraint === "plagas_enfermedades_etapas_niveles_unique"
      ) {
        throw new ConflictException(
          "The pest/disease, phenological stage and incidence/severity level relation already exists."
        );
      }

      if (
        operation === "save" &&
        databaseError?.code === "23503" &&
        databaseError.constraint === "plagas_enfermedades_etapas_niveles_plaga_fkey"
      ) {
        throw new BadRequestException("Pest disease not found.");
      }

      if (
        operation === "save" &&
        databaseError?.code === "23503" &&
        databaseError.constraint === "plagas_enfermedades_etapas_niveles_etapa_fkey"
      ) {
        throw new BadRequestException("Phenological stage not found.");
      }

      if (
        operation === "save" &&
        databaseError?.code === "23503" &&
        databaseError.constraint === "plagas_enfermedades_etapas_niveles_nivel_fkey"
      ) {
        throw new BadRequestException("Incidence or severity level not found.");
      }
    }

    throw error;
  }

  private handleIncidenceLevelPersistenceError(
    error: unknown,
    operation: "save" | "delete"
  ): never {
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
        databaseError.constraint ===
          "niveles_incidencia_severidad_tipo_nombre_key"
      ) {
        throw new ConflictException(
          "An incidence or severity level with the same type and name already exists."
        );
      }

      if (
        operation === "save" &&
        databaseError?.code === "23505" &&
        databaseError.constraint ===
          "niveles_incidencia_severidad_tipo_valor_orden_key"
      ) {
        throw new ConflictException(
          "An incidence or severity level with the same type and sort order already exists."
        );
      }

      if (operation === "delete" && databaseError?.code === "23503") {
        throw new ConflictException(
          "Cannot delete the incidence level because it is in use."
        );
      }
    }

    throw error;
  }

  private toPestDiseaseResponse(pestDisease: PlagaEnfermedadEntity) {
    return {
      id: pestDisease.id,
      scientificName: pestDisease.scientificName,
      name: pestDisease.name,
      type: pestDisease.type,
      isActive: pestDisease.isActive
    };
  }

  private toIncidenceLevelResponse(incidenceLevel: NivelIncidenciaEntity) {
    return {
      id: incidenceLevel.id,
      name: incidenceLevel.name,
      sortOrder: incidenceLevel.sortOrder,
      type: incidenceLevel.type
    };
  }

  private toPestDiseaseStageLevelResponse(
    item: PlagaEnfermedadEtapaNivelEntity
  ) {
    return {
      id: item.id,
      plagaEnfermedadId: item.plagaEnfermedadId,
      etapaFenologicaId: item.etapaFenologicaId,
      nivelIncidenciaSeveridadId: item.nivelIncidenciaSeveridadId,
      description: item.description,
      isActive: item.isActive,
      plagaEnfermedad: item.plagaEnfermedad
        ? this.toPestDiseaseResponse(item.plagaEnfermedad)
        : null,
      etapaFenologica: item.etapaFenologica
        ? {
            id: item.etapaFenologica.id,
            name: item.etapaFenologica.name,
            type: item.etapaFenologica.type,
            sortOrder: item.etapaFenologica.sortOrder
          }
        : null,
      nivelIncidenciaSeveridad: item.nivelIncidenciaSeveridad
        ? this.toIncidenceLevelResponse(item.nivelIncidenciaSeveridad)
        : null
    };
  }
}
