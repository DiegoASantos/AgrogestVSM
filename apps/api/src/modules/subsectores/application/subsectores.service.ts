import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { FindOptionsWhere } from "typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { createPaginatedMeta, createSuccessResponse } from "../../../common/http/api-response";
import { ParcelaEntity } from "../../parcelas/infrastructure/persistence/entities/parcela.entity";
import { SectorEntity } from "../../sectores/infrastructure/persistence/entities/sector.entity";
import { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";
import { CreateSubsectorDto } from "../presentation/dto/create-subsector.dto";
import { FindSubsectoresQueryDto } from "../presentation/dto/find-subsectores-query.dto";
import { UpdateSubsectorDto } from "../presentation/dto/update-subsector.dto";
import { SubsectorEntity } from "../infrastructure/persistence/entities/subsector.entity";

@Injectable()
export class SubsectoresService {
  constructor(
    @InjectRepository(SubsectorEntity)
    private readonly subsectoresRepository: Repository<SubsectorEntity>,
    @InjectRepository(SectorEntity)
    private readonly sectoresRepository: Repository<SectorEntity>,
    @InjectRepository(ProductorEntity)
    private readonly productoresRepository: Repository<ProductorEntity>
  ) {}

  async create(createSubsectorDto: CreateSubsectorDto) {
    await this.ensureSectorExists(createSubsectorDto.sectorId);
    await this.ensureUniqueName(createSubsectorDto.sectorId, createSubsectorDto.name);

    const subsector = this.subsectoresRepository.create({
      sectorId: createSubsectorDto.sectorId,
      name: createSubsectorDto.name,
      description: createSubsectorDto.description ?? null,
      isActive: createSubsectorDto.isActive ?? true
    });

    try {
      const savedSubsector = await this.subsectoresRepository.save(subsector);

      return createSuccessResponse(this.toResponse(savedSubsector));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findAll(query: FindSubsectoresQueryDto) {
    const where: FindOptionsWhere<SubsectorEntity> = {};

    if (query.sector_id !== undefined) {
      where.sectorId = query.sector_id;
    }

    if (query.activo !== undefined) {
      where.isActive = query.activo;
    }

    const [subsectores, total] = await this.subsectoresRepository.findAndCount({
      where,
      order: {
        sectorId: "ASC",
        name: "ASC"
      },
      skip: query.skip,
      take: query.take
    });

    return createSuccessResponse(
      subsectores.map((subsector) => this.toResponse(subsector)),
      createPaginatedMeta(total, query.page, query.limit)
    );
  }

  async findById(id: string) {
    const subsector = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(subsector));
  }

  async findBySectorId(sectorId: string) {
    await this.ensureSectorExists(sectorId, true);

    const subsectores = await this.findEntitiesBySectorId(sectorId);

    return createSuccessResponse(
      subsectores.map((subsector) => this.toResponse(subsector)),
      { count: subsectores.length }
    );
  }

  async findByProductorAndSector(productorId: string, sectorId: string) {
    await this.ensureProductorExists(productorId, true);
    await this.ensureSectorExists(sectorId, true);

    const subsectores = await this.subsectoresRepository
      .createQueryBuilder("subsector")
      .innerJoin(ParcelaEntity, "parcela", "parcela.subsector_id = subsector.id")
      .where("parcela.productor_id = :productorId", { productorId })
      .andWhere("subsector.sector_id = :sectorId", { sectorId })
      .distinct(true)
      .orderBy("subsector.name", "ASC")
      .getMany();

    return createSuccessResponse(
      subsectores.map((subsector) => this.toResponse(subsector)),
      { count: subsectores.length }
    );
  }

  async update(id: string, updateSubsectorDto: UpdateSubsectorDto) {
    const subsector = await this.findEntityById(id);
    const nextSectorId = updateSubsectorDto.sectorId ?? subsector.sectorId;
    const nextName = updateSubsectorDto.name ?? subsector.name;

    if (updateSubsectorDto.sectorId !== undefined) {
      await this.ensureSectorExists(updateSubsectorDto.sectorId);
    }

    await this.ensureUniqueName(nextSectorId, nextName, subsector.id);

    const updatedSubsector = this.subsectoresRepository.merge(subsector, {
      ...(updateSubsectorDto.sectorId !== undefined
        ? { sectorId: updateSubsectorDto.sectorId }
        : {}),
      ...(updateSubsectorDto.name !== undefined
        ? { name: updateSubsectorDto.name }
        : {}),
      ...(updateSubsectorDto.description !== undefined
        ? { description: updateSubsectorDto.description }
        : {}),
      ...(updateSubsectorDto.isActive !== undefined
        ? { isActive: updateSubsectorDto.isActive }
        : {}),
      updatedAt: new Date()
    });

    try {
      const savedSubsector =
        await this.subsectoresRepository.save(updatedSubsector);

      return createSuccessResponse(this.toResponse(savedSubsector));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string) {
    const subsector = await this.findEntityById(id);

    if (!subsector.isActive) {
      return createSuccessResponse(this.toResponse(subsector));
    }

    subsector.isActive = false;
    subsector.updatedAt = new Date();

    const savedSubsector = await this.subsectoresRepository.save(subsector);

    return createSuccessResponse(this.toResponse(savedSubsector));
  }

  findEntitiesBySectorId(sectorId: string): Promise<SubsectorEntity[]> {
    return this.subsectoresRepository.find({
      where: { sectorId },
      order: { name: "ASC" }
    });
  }

  private async findEntityById(id: string) {
    const subsector = await this.subsectoresRepository.findOne({
      where: { id }
    });

    if (!subsector) {
      throw new NotFoundException("Subsector not found.");
    }

    return subsector;
  }

  private async ensureSectorExists(sectorId: string, useNotFoundException = false) {
    const sector = await this.sectoresRepository.findOne({
      where: { id: sectorId }
    });

    if (!sector) {
      if (useNotFoundException) {
        throw new NotFoundException("Sector not found.");
      }

      throw new BadRequestException("Sector not found.");
    }
  }

  private async ensureProductorExists(
    productorId: string,
    useNotFoundException = false
  ) {
    const productor = await this.productoresRepository.findOne({
      where: { id: productorId }
    });

    if (!productor) {
      if (useNotFoundException) {
        throw new NotFoundException("Productor not found.");
      }

      throw new BadRequestException("Productor not found.");
    }
  }

  private async ensureUniqueName(
    sectorId: string,
    name: string,
    excludedId?: string
  ) {
    const existingSubsector = await this.subsectoresRepository.findOne({
      where: {
        sectorId,
        name
      }
    });

    if (existingSubsector && existingSubsector.id !== excludedId) {
      throw new ConflictException(
        "A subsector with the same name already exists for this sector."
      );
    }
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
        databaseError.constraint === "uq_subsectores_sector_nombre"
      ) {
        throw new ConflictException(
          "A subsector with the same name already exists for this sector."
        );
      }

      if (
        databaseError?.code === "23503" &&
        databaseError.constraint === "subsectores_sector_id_fkey"
      ) {
        throw new BadRequestException("Sector not found.");
      }
    }

    throw error;
  }

  private toResponse(subsector: SubsectorEntity) {
    return {
      id: subsector.id,
      publicId: subsector.publicId,
      sectorId: subsector.sectorId,
      name: subsector.name,
      description: subsector.description,
      isActive: subsector.isActive,
      createdAt: subsector.createdAt,
      updatedAt: subsector.updatedAt
    };
  }
}
