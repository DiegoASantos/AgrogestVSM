import {
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
import { NivelIncidenciaEntity } from "../infrastructure/persistence/entities/nivel-incidencia.entity";
import { PlagaEnfermedadEntity } from "../infrastructure/persistence/entities/plaga-enfermedad.entity";
import { CreateNivelIncidenciaDto } from "../presentation/dto/create-nivel-incidencia.dto";
import { CreatePlagaEnfermedadDto } from "../presentation/dto/create-plaga-enfermedad.dto";
import { UpdateNivelIncidenciaDto } from "../presentation/dto/update-nivel-incidencia.dto";
import { UpdatePlagaEnfermedadDto } from "../presentation/dto/update-plaga-enfermedad.dto";

@Injectable()
export class SanitaryCatalogsService {
  constructor(
    @InjectRepository(PlagaEnfermedadEntity)
    private readonly plagasEnfermedadesRepository: Repository<PlagaEnfermedadEntity>,
    @InjectRepository(NivelIncidenciaEntity)
    private readonly nivelesIncidenciaRepository: Repository<NivelIncidenciaEntity>
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
      code: createPlagaEnfermedadDto.code ?? null,
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
        ...(updatePlagaEnfermedadDto.code !== undefined
          ? { code: updatePlagaEnfermedadDto.code }
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

  async findAllIncidenceLevels(pagination: PaginationQueryDto) {
    const [incidenceLevels, total] =
      await this.nivelesIncidenciaRepository.findAndCount({
        order: {
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
      sortOrder: createNivelIncidenciaDto.sortOrder
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
        databaseError.constraint === "niveles_incidencia_nombre_key"
      ) {
        throw new ConflictException(
          "An incidence level with the same name already exists."
        );
      }

      if (
        operation === "save" &&
        databaseError?.code === "23505" &&
        databaseError.constraint === "niveles_incidencia_valor_orden_key"
      ) {
        throw new ConflictException(
          "An incidence level with the same sort order already exists."
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
      code: pestDisease.code,
      name: pestDisease.name,
      type: pestDisease.type,
      isActive: pestDisease.isActive
    };
  }

  private toIncidenceLevelResponse(incidenceLevel: NivelIncidenciaEntity) {
    return {
      id: incidenceLevel.id,
      name: incidenceLevel.name,
      sortOrder: incidenceLevel.sortOrder
    };
  }
}
