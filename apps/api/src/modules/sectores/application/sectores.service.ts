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
import { DistritoEntity } from "../../geografias/infrastructure/persistence/entities/distrito.entity";
import { ParcelaEntity } from "../../parcelas/infrastructure/persistence/entities/parcela.entity";
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
    @InjectRepository(DistritoEntity)
    private readonly distritosRepository: Repository<DistritoEntity>,
    @InjectRepository(ProductorEntity)
    private readonly productoresRepository: Repository<ProductorEntity>
  ) {}

  async create(createSectorDto: CreateSectorDto) {
    await this.ensureDistritoExists(createSectorDto.distritoId);
    await this.ensureUniqueName(createSectorDto.distritoId, createSectorDto.name);

    const sector = this.sectoresRepository.create({
      distritoId: createSectorDto.distritoId,
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

    if (query.distrito_id !== undefined) {
      where.distritoId = query.distrito_id;
    }

    if (query.activo !== undefined) {
      where.isActive = query.activo;
    }

    const [sectores, total] = await this.sectoresRepository.findAndCount({
      where,
      order: {
        distritoId: "ASC",
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
    const nextDistritoId = updateSectorDto.distritoId ?? sector.distritoId;
    const nextName = updateSectorDto.name ?? sector.name;

    if (updateSectorDto.distritoId !== undefined) {
      await this.ensureDistritoExists(updateSectorDto.distritoId);
    }

    await this.ensureUniqueName(nextDistritoId, nextName, sector.id);

    const updatedSector = this.sectoresRepository.merge(sector, {
      ...(updateSectorDto.distritoId !== undefined
        ? { distritoId: updateSectorDto.distritoId }
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
    return this.sectoresRepository
      .createQueryBuilder("sector")
      .innerJoin(ParcelaEntity, "parcela", "parcela.sector_id = sector.id")
      .where("parcela.productor_id = :productorId", { productorId })
      .distinct(true)
      .orderBy("sector.nombre", "ASC")
      .getMany();
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

  private async ensureDistritoExists(distritoId: string) {
    const distrito = await this.distritosRepository.findOne({
      where: { id: distritoId }
    });

    if (!distrito) {
      throw new BadRequestException("Distrito not found.");
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
    distritoId: string,
    name: string,
    excludedId?: string
  ) {
    const existingSector = await this.sectoresRepository.findOne({
      where: {
        distritoId,
        name
      }
    });

    if (existingSector && existingSector.id !== excludedId) {
      throw new ConflictException(
        "A sector with the same name already exists for this distrito."
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
        databaseError.constraint === "sectores_distrito_id_nombre_key"
      ) {
        throw new ConflictException(
          "A sector with the same name already exists for this distrito."
        );
      }

      if (
        databaseError?.code === "23503" &&
        databaseError.constraint === "sectores_distrito_id_fkey"
      ) {
        throw new BadRequestException("Distrito not found.");
      }
    }

    throw error;
  }

  private toResponse(sector: SectorEntity) {
    return {
      id: sector.id,
      distritoId: sector.distritoId,
      name: sector.name,
      description: sector.description,
      isActive: sector.isActive,
      createdAt: sector.createdAt,
      updatedAt: sector.updatedAt
    };
  }
}
