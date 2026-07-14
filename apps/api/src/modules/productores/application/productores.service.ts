import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, QueryFailedError, Repository } from "typeorm";

import { createPaginatedMeta, createSuccessResponse } from "../../../common/http/api-response";
import { ParcelasService } from "../../parcelas/application/parcelas.service";
import { ParcelaEntity } from "../../parcelas/infrastructure/persistence/entities/parcela.entity";
import { SectoresService } from "../../sectores/application/sectores.service";
import { SectorEntity } from "../../sectores/infrastructure/persistence/entities/sector.entity";
import { SubsectorEntity } from "../../subsectores/infrastructure/persistence/entities/subsector.entity";
import { VisitasCampoService } from "../../visitas-campo/application/visitas-campo.service";
import { FindHistorialVisitasProductorQueryDto } from "../../visitas-campo/presentation/dto/find-historial-visitas-productor-query.dto";
import { CreateProductorDto } from "../presentation/dto/create-productor.dto";
import { FindProductoresQueryDto } from "../presentation/dto/find-productores-query.dto";
import { UpdateProductorDto } from "../presentation/dto/update-productor.dto";
import {
  ProductorEntity,
  type ProductorEntityType
} from "../infrastructure/persistence/entities/productor.entity";

type CurrentUserContext = {
  userId: string;
  roles: string[];
};

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
    const entityType = createProductorDto.entityType ?? "persona";

    this.validateProducerInput(entityType, createProductorDto);

    if (
      entityType === "persona" &&
      createProductorDto.documentTypeId &&
      createProductorDto.documentNumber
    ) {
      await this.ensureUniqueDocument(
        createProductorDto.documentTypeId,
        createProductorDto.documentNumber
      );
    }

    const productor = this.productoresRepository.create({
      entityType,
      documentTypeId:
        entityType === "persona" ? createProductorDto.documentTypeId ?? null : null,
      documentNumber:
        entityType === "persona" ? createProductorDto.documentNumber ?? null : null,
      firstName: createProductorDto.firstName ?? null,
      lastName: entityType === "persona" ? createProductorDto.lastName ?? null : null,
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

  async findAll(query: FindProductoresQueryDto, currentUser?: CurrentUserContext) {
    const queryBuilder = this.productoresRepository
      .createQueryBuilder("productor")
      .orderBy("productor.creado_at", "DESC")
      .skip(query.skip)
      .take(query.take);

    if (isAgronomoUser(currentUser)) {
      queryBuilder
        .innerJoin(
          "parcelas",
          "p",
          "p.productor_id = productor.id AND p.agronomo_usuario_id = :currentUserId",
          { currentUserId: currentUser!.userId }
        )
        .distinct(true);
    }

    if (query.activo !== undefined) {
      queryBuilder.andWhere("productor.activo = :isActive", {
        isActive: query.activo
      });
    }

    if (query.search) {
      const searchValue = `%${query.search.toLowerCase()}%`;

      queryBuilder.andWhere(
        new Brackets((searchQuery) => {
          searchQuery
            .where("LOWER(COALESCE(productor.nombres, '')) LIKE :search", {
              search: searchValue
            })
            .orWhere("LOWER(COALESCE(productor.apellidos, '')) LIKE :search", {
              search: searchValue
            })
            .orWhere("LOWER(COALESCE(productor.nro_documento, '')) LIKE :search", {
              search: searchValue
            });
        })
      );
    }

    const [productores, total] = await queryBuilder.getManyAndCount();

    return createSuccessResponse(
      productores.map((productor) => this.toResponse(productor)),
      createPaginatedMeta(total, query.page, query.limit)
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

    const parcelasBySubsectorId = parcelas.reduce<Record<string, ParcelaEntity[]>>(
      (accumulator, parcela) => {
        const currentSubsectorParcelas = accumulator[parcela.subsectorId] ?? [];

        currentSubsectorParcelas.push(parcela);
        accumulator[parcela.subsectorId] = currentSubsectorParcelas;

        return accumulator;
      },
      {}
    );
    const subsectoresBySectorId = parcelas.reduce<Record<string, SubsectorEntity[]>>(
      (accumulator, parcela) => {
        if (!parcela.subsector) {
          return accumulator;
        }

        const currentSubsectores = accumulator[parcela.subsector.sectorId] ?? [];

        if (
          !currentSubsectores.some(
            (subsector) => subsector.id === parcela.subsectorId
          )
        ) {
          currentSubsectores.push(parcela.subsector);
        }

        accumulator[parcela.subsector.sectorId] = currentSubsectores;

        return accumulator;
      },
      {}
    );

    return createSuccessResponse({
      productor: this.toResponse(productor),
      sectores: sectores.map((sector) =>
        this.toStructureSectorResponse(
          sector,
          subsectoresBySectorId[sector.id] ?? [],
          parcelasBySubsectorId
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
    const nextEntityType = updateProductorDto.entityType ?? productor.entityType;
    const nextDocumentTypeId =
      updateProductorDto.documentTypeId !== undefined
        ? updateProductorDto.documentTypeId
        : productor.documentTypeId;
    const nextDocumentNumber =
      updateProductorDto.documentNumber !== undefined
        ? updateProductorDto.documentNumber
        : productor.documentNumber;
    const nextFirstName =
      updateProductorDto.firstName !== undefined
        ? updateProductorDto.firstName
        : productor.firstName;
    const nextLastName =
      updateProductorDto.lastName !== undefined
        ? updateProductorDto.lastName
        : productor.lastName;

    this.validateProducerInput(nextEntityType, {
      ...updateProductorDto,
      documentTypeId: nextDocumentTypeId,
      documentNumber: nextDocumentNumber,
      firstName: nextFirstName,
      lastName: nextLastName
    });

    if (nextEntityType === "persona" && nextDocumentTypeId && nextDocumentNumber) {
      await this.ensureUniqueDocument(
        nextDocumentTypeId,
        nextDocumentNumber,
        productor.id
      );
    }

    const updatedProductor = this.productoresRepository.merge(productor, {
      ...(updateProductorDto.entityType !== undefined
        ? { entityType: updateProductorDto.entityType }
        : {}),
      ...(updateProductorDto.documentTypeId !== undefined
        ? {
            documentTypeId:
              nextEntityType === "persona" ? updateProductorDto.documentTypeId : null
          }
        : {}),
      ...(updateProductorDto.documentNumber !== undefined
        ? {
            documentNumber:
              nextEntityType === "persona" ? updateProductorDto.documentNumber : null
          }
        : {}),
      ...(updateProductorDto.firstName !== undefined
        ? { firstName: updateProductorDto.firstName }
        : {}),
      ...(updateProductorDto.lastName !== undefined && nextEntityType === "persona"
        ? { lastName: updateProductorDto.lastName }
        : {}),
      ...(nextEntityType !== "persona"
        ? { documentTypeId: null, documentNumber: null, lastName: null }
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

      if (
        databaseError?.code === "23514" &&
        databaseError.constraint === "chk_productores_entidad"
      ) {
        throw new BadRequestException("Invalid productor entity type.");
      }
    }

    throw error;
  }

  private validateProducerInput(
    entityType: ProductorEntityType,
    input: Pick<
      CreateProductorDto,
      "documentTypeId" | "documentNumber" | "firstName" | "lastName"
    >
  ) {
    if (!input.firstName) {
      throw new BadRequestException("El nombre del productor es obligatorio.");
    }

    if (entityType === "persona") {
      if (!input.lastName) {
        throw new BadRequestException(
          "Los apellidos son obligatorios para personas."
        );
      }

      if (
        (input.documentTypeId && !input.documentNumber) ||
        (!input.documentTypeId && input.documentNumber)
      ) {
        throw new BadRequestException(
          "Tipo y numero de documento deben registrarse juntos."
        );
      }

      return;
    }
  }

  private toResponse(productor: ProductorEntity) {
    return {
      id: productor.id,
      publicId: productor.publicId,
      entityType: productor.entityType,
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
    subsectores: SubsectorEntity[],
    parcelasBySubsectorId: Record<string, ParcelaEntity[]>
  ) {
    return {
      id: sector.id,
      distritoId: sector.distritoId,
      name: sector.name,
      description: sector.description,
      isActive: sector.isActive,
      createdAt: sector.createdAt,
      updatedAt: sector.updatedAt,
      parcelasCount: subsectores.reduce(
        (total, subsector) =>
          total + (parcelasBySubsectorId[subsector.id]?.length ?? 0),
        0
      ),
      subsectores: subsectores.map((subsector) => ({
        id: subsector.id,
        publicId: subsector.publicId,
        sectorId: subsector.sectorId,
        name: subsector.name,
        description: subsector.description,
        isActive: subsector.isActive,
        createdAt: subsector.createdAt,
        updatedAt: subsector.updatedAt,
        parcelasCount: parcelasBySubsectorId[subsector.id]?.length ?? 0,
        parcelas: (parcelasBySubsectorId[subsector.id] ?? []).map((parcela) => ({
          id: parcela.id,
          publicId: parcela.publicId,
          productorId: parcela.productorId,
          subsectorId: parcela.subsectorId,
          sectorId: subsector.sectorId,
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
      }))
    };
  }
}

function isAgronomoUser(currentUser?: CurrentUserContext): boolean {
  if (!currentUser) {
    return false;
  }

  const hasAdmin = currentUser.roles.includes("ADMIN");
  const hasAgronomo = currentUser.roles.includes("AGRONOMO");

  return hasAgronomo && !hasAdmin;
}
