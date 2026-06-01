import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { createPaginatedMeta, createSuccessResponse } from "../../../common/http/api-response";
import type { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { ParcelasService } from "../../parcelas/application/parcelas.service";
import { ParcelaEntity } from "../../parcelas/infrastructure/persistence/entities/parcela.entity";
import { SectoresService } from "../../sectores/application/sectores.service";
import { SectorEntity } from "../../sectores/infrastructure/persistence/entities/sector.entity";
import { VisitasCampoService } from "../../visitas-campo/application/visitas-campo.service";
import { FindHistorialVisitasProductorQueryDto } from "../../visitas-campo/presentation/dto/find-historial-visitas-productor-query.dto";
import { CreateProductorDto } from "../presentation/dto/create-productor.dto";
import { UpdateProductorDto } from "../presentation/dto/update-productor.dto";
import { ProductorEntity } from "../infrastructure/persistence/entities/productor.entity";

@Injectable()
export class ProductoresService {
  constructor(
    @InjectRepository(ProductorEntity)
    private readonly productoresRepository: Repository<ProductorEntity>,
    private readonly sectoresService: SectoresService,
    private readonly parcelasService: ParcelasService,
    private readonly visitasCampoService: VisitasCampoService
  ) {}

  async create(createProductorDto: CreateProductorDto) {
    await this.ensureUniqueDocument(
      createProductorDto.documentTypeId,
      createProductorDto.documentNumber
    );

    const productor = this.productoresRepository.create({
      documentTypeId: createProductorDto.documentTypeId,
      documentNumber: createProductorDto.documentNumber,
      firstName: createProductorDto.firstName ?? null,
      lastName: createProductorDto.lastName ?? null,
      phone: createProductorDto.phone ?? null,
      email: createProductorDto.email ?? null,
      address: createProductorDto.address ?? null,
      isActive: createProductorDto.isActive ?? true
    });

    try {
      const savedProductor = await this.productoresRepository.save(productor);

      return createSuccessResponse(this.toResponse(savedProductor));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findAll(pagination: PaginationQueryDto) {
    const [productores, total] = await this.productoresRepository.findAndCount({
      order: {
        createdAt: "DESC"
      },
      skip: pagination.skip,
      take: pagination.take
    });

    return createSuccessResponse(
      productores.map((productor) => this.toResponse(productor)),
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }

  async findById(id: string) {
    const productor = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(productor));
  }

  async getSummary(id: string) {
    const productor = await this.findEntityById(id);
    const sectores = await this.sectoresService.findEntitiesByProductorId(id);
    const parcelasCount = await this.parcelasService.countByProductorId(id);

    return createSuccessResponse({
      productor: this.toResponse(productor),
      totals: {
        sectoresCount: sectores.length,
        parcelasCount
      }
    });
  }

  async getStructure(id: string) {
    const productor = await this.findEntityById(id);
    const sectores = await this.sectoresService.findEntitiesByProductorId(id);
    const parcelas = await this.parcelasService.findEntitiesByProductorId(id);

    const parcelasBySectorId = parcelas.reduce<Record<string, ParcelaEntity[]>>(
      (accumulator, parcela) => {
        const currentSectorParcelas = accumulator[parcela.sectorId] ?? [];

        currentSectorParcelas.push(parcela);
        accumulator[parcela.sectorId] = currentSectorParcelas;

        return accumulator;
      },
      {}
    );

    return createSuccessResponse({
      productor: this.toResponse(productor),
      sectores: sectores.map((sector) =>
        this.toStructureSectorResponse(
          sector,
          parcelasBySectorId[sector.id] ?? []
        )
      )
    });
  }

  async getHistorialVisitas(
    id: string,
    query: FindHistorialVisitasProductorQueryDto
  ) {
    return this.visitasCampoService.findHistoryByProductorId(id, query);
  }

  async update(id: string, updateProductorDto: UpdateProductorDto) {
    const productor = await this.findEntityById(id);
    const nextDocumentTypeId =
      updateProductorDto.documentTypeId ?? productor.documentTypeId;
    const nextDocumentNumber =
      updateProductorDto.documentNumber ?? productor.documentNumber;

    await this.ensureUniqueDocument(
      nextDocumentTypeId,
      nextDocumentNumber,
      productor.id
    );

    const updatedProductor = this.productoresRepository.merge(productor, {
      ...(updateProductorDto.documentTypeId !== undefined
        ? { documentTypeId: updateProductorDto.documentTypeId }
        : {}),
      ...(updateProductorDto.documentNumber !== undefined
        ? { documentNumber: updateProductorDto.documentNumber }
        : {}),
      ...(updateProductorDto.firstName !== undefined
        ? { firstName: updateProductorDto.firstName }
        : {}),
      ...(updateProductorDto.lastName !== undefined
        ? { lastName: updateProductorDto.lastName }
        : {}),
      ...(updateProductorDto.phone !== undefined
        ? { phone: updateProductorDto.phone }
        : {}),
      ...(updateProductorDto.email !== undefined
        ? { email: updateProductorDto.email }
        : {}),
      ...(updateProductorDto.address !== undefined
        ? { address: updateProductorDto.address }
        : {}),
      ...(updateProductorDto.isActive !== undefined
        ? { isActive: updateProductorDto.isActive }
        : {}),
      updatedAt: new Date()
    });

    try {
      const savedProductor =
        await this.productoresRepository.save(updatedProductor);

      return createSuccessResponse(this.toResponse(savedProductor));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string) {
    const productor = await this.findEntityById(id);

    if (!productor.isActive) {
      return createSuccessResponse(this.toResponse(productor));
    }

    productor.isActive = false;
    productor.updatedAt = new Date();

    const savedProductor = await this.productoresRepository.save(productor);

    return createSuccessResponse(this.toResponse(savedProductor));
  }

  private async findEntityById(id: string) {
    const productor = await this.productoresRepository.findOne({
      where: { id }
    });

    if (!productor) {
      throw new NotFoundException("Productor not found.");
    }

    return productor;
  }

  private async ensureUniqueDocument(
    documentTypeId: number,
    documentNumber: string,
    excludedId?: string
  ) {
    const existingProductor = await this.productoresRepository.findOne({
      where: {
        documentTypeId,
        documentNumber
      }
    });

    if (existingProductor && existingProductor.id !== excludedId) {
      throw new ConflictException(
        "A productor with the same document already exists."
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
        databaseError.constraint ===
          "productores_tipo_documento_id_nro_documento_key"
      ) {
        throw new ConflictException(
          "A productor with the same document already exists."
        );
      }

      if (
        databaseError?.code === "23503" &&
        databaseError.constraint === "productores_tipo_documento_id_fkey"
      ) {
        throw new BadRequestException("Invalid document type.");
      }
    }

    throw error;
  }

  private toResponse(productor: ProductorEntity) {
    return {
      id: productor.id,
      publicId: productor.publicId,
      documentTypeId: productor.documentTypeId,
      documentNumber: productor.documentNumber,
      firstName: productor.firstName,
      lastName: productor.lastName,
      phone: productor.phone,
      email: productor.email,
      address: productor.address,
      isActive: productor.isActive,
      createdAt: productor.createdAt,
      updatedAt: productor.updatedAt
    };
  }

  private toStructureSectorResponse(
    sector: SectorEntity,
    parcelas: ParcelaEntity[]
  ) {
    return {
      id: sector.id,
      distritoId: sector.distritoId,
      name: sector.name,
      description: sector.description,
      isActive: sector.isActive,
      createdAt: sector.createdAt,
      updatedAt: sector.updatedAt,
      parcelasCount: parcelas.length,
      parcelas: parcelas.map((parcela) => ({
        id: parcela.id,
        publicId: parcela.publicId,
        productorId: parcela.productorId,
        sectorId: parcela.sectorId,
        code: parcela.code,
        name: parcela.name,
        areaHectares: parcela.areaHectares,
        description: parcela.description,
        referencePoint: parcela.referencePoint,
        geometry: parcela.geometry,
        isActive: parcela.isActive,
        createdAt: parcela.createdAt,
        updatedAt: parcela.updatedAt
      }))
    };
  }
}
