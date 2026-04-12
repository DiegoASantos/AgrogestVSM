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
import { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";
import { CreateSectorDto } from "../presentation/dto/create-sector.dto";
import { FindSectoresQueryDto } from "../presentation/dto/find-sectores-query.dto";
import { UpdateSectorDto } from "../presentation/dto/update-sector.dto";
import { SectorEntity } from "../infrastructure/persistence/entities/sector.entity";

@Injectable()
export class SectoresService {
  constructor(
    @InjectRepository(SectorEntity)
    private readonly sectoresRepository: Repository<SectorEntity>,
    @InjectRepository(ProductorEntity)
    private readonly productoresRepository: Repository<ProductorEntity>
  ) {}

  async create(createSectorDto: CreateSectorDto) {
    await this.ensureProductorExists(createSectorDto.productorId);
    await this.ensureUniqueName(
      createSectorDto.productorId,
      createSectorDto.name
    );

    const sector = this.sectoresRepository.create({
      productorId: createSectorDto.productorId,
      name: createSectorDto.name,
      description: createSectorDto.description ?? null,
      isActive: createSectorDto.isActive ?? true
    });

    try {
      const savedSector = await this.sectoresRepository.save(sector);

      return createSuccessResponse(this.toResponse(savedSector));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findAll(query: FindSectoresQueryDto) {
    const where: FindOptionsWhere<SectorEntity> = {};

    if (query.productor_id !== undefined) {
      where.productorId = query.productor_id;
    }

    if (query.activo !== undefined) {
      where.isActive = query.activo;
    }

    const [sectores, total] = await this.sectoresRepository.findAndCount({
      where,
      order: {
        productorId: "ASC",
        name: "ASC"
      },
      skip: query.skip,
      take: query.take
    });

    return createSuccessResponse(
      sectores.map((sector) => this.toResponse(sector)),
      createPaginatedMeta(total, query.page, query.limit)
    );
  }

  async findById(id: string) {
    const sector = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(sector));
  }

  async findByProductorId(productorId: string) {
    await this.ensureProductorExists(productorId, true);

    const sectores = await this.findEntitiesByProductorId(productorId);

    return createSuccessResponse(
      sectores.map((sector) => this.toResponse(sector)),
      {
        count: sectores.length
      }
    );
  }

  async update(id: string, updateSectorDto: UpdateSectorDto) {
    const sector = await this.findEntityById(id);
    const nextProductorId = updateSectorDto.productorId ?? sector.productorId;
    const nextName = updateSectorDto.name ?? sector.name;

    if (updateSectorDto.productorId !== undefined) {
      await this.ensureProductorExists(updateSectorDto.productorId);
    }

    await this.ensureUniqueName(nextProductorId, nextName, sector.id);

    const updatedSector = this.sectoresRepository.merge(sector, {
      ...(updateSectorDto.productorId !== undefined
        ? { productorId: updateSectorDto.productorId }
        : {}),
      ...(updateSectorDto.name !== undefined ? { name: updateSectorDto.name } : {}),
      ...(updateSectorDto.description !== undefined
        ? { description: updateSectorDto.description }
        : {}),
      ...(updateSectorDto.isActive !== undefined
        ? { isActive: updateSectorDto.isActive }
        : {}),
      updatedAt: new Date()
    });

    try {
      const savedSector = await this.sectoresRepository.save(updatedSector);

      return createSuccessResponse(this.toResponse(savedSector));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string) {
    const sector = await this.findEntityById(id);

    if (!sector.isActive) {
      return createSuccessResponse(this.toResponse(sector));
    }

    sector.isActive = false;
    sector.updatedAt = new Date();

    const savedSector = await this.sectoresRepository.save(sector);

    return createSuccessResponse(this.toResponse(savedSector));
  }

  findEntitiesByProductorId(productorId: string): Promise<SectorEntity[]> {
    return this.sectoresRepository.find({
      where: {
        productorId
      },
      order: {
        name: "ASC"
      }
    });
  }

  private async findEntityById(id: string) {
    const sector = await this.sectoresRepository.findOne({
      where: { id }
    });

    if (!sector) {
      throw new NotFoundException("Sector not found.");
    }

    return sector;
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
    productorId: string,
    name: string,
    excludedId?: string
  ) {
    const existingSector = await this.sectoresRepository.findOne({
      where: {
        productorId,
        name
      }
    });

    if (existingSector && existingSector.id !== excludedId) {
      throw new ConflictException(
        "A sector with the same name already exists for this productor."
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
        databaseError.constraint === "sectores_productor_id_nombre_key"
      ) {
        throw new ConflictException(
          "A sector with the same name already exists for this productor."
        );
      }

      if (
        databaseError?.code === "23503" &&
        databaseError.constraint === "sectores_productor_id_fkey"
      ) {
        throw new BadRequestException("Productor not found.");
      }
    }

    throw error;
  }

  private toResponse(sector: SectorEntity) {
    return {
      id: sector.id,
      productorId: sector.productorId,
      name: sector.name,
      description: sector.description,
      isActive: sector.isActive,
      createdAt: sector.createdAt,
      updatedAt: sector.updatedAt
    };
  }
}
