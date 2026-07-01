import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";

import { createPaginatedMeta, createSuccessResponse } from "../../../common/http/api-response";
import {
  createGeoJsonFeature,
  createGeoJsonFeatureCollection,
  normalizeGeoJsonMultiPolygon,
  normalizeGeoJsonPoint
} from "../../../common/utils/geo-json.util";
import { SectorEntity } from "../../sectores/infrastructure/persistence/entities/sector.entity";
import { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";
import { SubsectorEntity } from "../../subsectores/infrastructure/persistence/entities/subsector.entity";
import type { PaginationQueryDto } from "../../../common/dto/pagination-query.dto";
import { VisitasCampoService } from "../../visitas-campo/application/visitas-campo.service";
import { CreateParcelaDto } from "../presentation/dto/create-parcela.dto";
import { FindParcelasQueryDto } from "../presentation/dto/find-parcelas-query.dto";
import { FindParcelasSummaryQueryDto } from "../presentation/dto/find-parcelas-summary-query.dto";
import { UpdateParcelaDto } from "../presentation/dto/update-parcela.dto";
import {
  MultiPolygonGeometry,
  ParcelaEntity,
  PointGeometry
} from "../infrastructure/persistence/entities/parcela.entity";
import { assertParcelaGeodataIsPersistable } from "./parcela-geodata-validation.util";

@Injectable()
export class ParcelasService {
  constructor(
    @InjectRepository(ParcelaEntity)
    private readonly parcelasRepository: Repository<ParcelaEntity>,
    @InjectRepository(SectorEntity)
    private readonly sectoresRepository: Repository<SectorEntity>,
    @InjectRepository(SubsectorEntity)
    private readonly subsectoresRepository: Repository<SubsectorEntity>,
    @InjectRepository(ProductorEntity)
    private readonly productoresRepository: Repository<ProductorEntity>,
    private readonly visitasCampoService: VisitasCampoService
  ) {}

  async create(createParcelaDto: CreateParcelaDto) {
    const subsector = await this.ensureSubsectorExists(createParcelaDto.subsectorId);
    await this.ensureProductorExists(createParcelaDto.productorId);
    const code = await this.generateNextCode();

    const referencePoint = validatePointGeometry(createParcelaDto.referencePoint);
    const geometry = validateMultiPolygonGeometry(createParcelaDto.geometry);
    const areaHectares = normalizeAreaHectares(createParcelaDto.areaHectares);
    await this.assertGeodataRules({
      subsectorId: createParcelaDto.subsectorId,
      geometry
    });

    const parcela = this.parcelasRepository.create({
      subsectorId: createParcelaDto.subsectorId,
      productorId: createParcelaDto.productorId,
      code,
      name: createParcelaDto.name ?? null,
      areaHectares,
      description: createParcelaDto.description ?? null,
      referencePoint,
      geometry,
      isActive: createParcelaDto.isActive ?? true
    });

    try {
      const savedParcela = await this.parcelasRepository.save(parcela);
      savedParcela.subsector = subsector;

      return createSuccessResponse(this.toResponse(savedParcela));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findAll(query: FindParcelasQueryDto) {
    const qb = this.createFindEntitiesQueryBuilder(query);
    qb.skip(query.skip).take(query.take);

    const [parcelas, total] = await qb.getManyAndCount();

    return createSuccessResponse(
      parcelas.map((parcela) => this.toResponse(parcela)),
      createPaginatedMeta(total, query.page, query.limit)
    );
  }

  async findMap(query: FindParcelasSummaryQueryDto) {
    const parcelas = await this.createFindEntitiesQueryBuilder(query).getMany();
    const featureCollection = createGeoJsonFeatureCollection(
      parcelas.flatMap((parcela) => this.toMapFeatures(parcela))
    );

    return createSuccessResponse(featureCollection, {
      count: parcelas.length,
      featuresCount: featureCollection.features.length
    });
  }

  async findById(id: string) {
    const parcela = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(parcela));
  }

  async findBySectorId(sectorId: string) {
    await this.ensureSectorExists(sectorId, true);

    const parcelas = await this.findEntitiesBySectorIds([sectorId]);

    return createSuccessResponse(
      parcelas.map((parcela) => this.toResponse(parcela)),
      {
        count: parcelas.length
      }
    );
  }

  async update(id: string, updateParcelaDto: UpdateParcelaDto) {
    const parcela = await this.findEntityById(id);
    const nextSubsectorId = updateParcelaDto.subsectorId ?? parcela.subsectorId;
    const nextProductorId = updateParcelaDto.productorId ?? parcela.productorId;
    const nextCode = updateParcelaDto.code ?? parcela.code;
    const nextGeometry =
      updateParcelaDto.geometry !== undefined
        ? validateMultiPolygonGeometry(updateParcelaDto.geometry)
        : normalizeGeoJsonMultiPolygon(parcela.geometry);

    let nextSubsector = parcela.subsector;

    if (updateParcelaDto.subsectorId !== undefined) {
      nextSubsector = await this.ensureSubsectorExists(updateParcelaDto.subsectorId);
    }

    if (updateParcelaDto.productorId !== undefined) {
      await this.ensureProductorExists(updateParcelaDto.productorId);
    }

    await this.ensureUniqueCode(nextProductorId, nextSubsectorId, nextCode, parcela.id);

    const updatedParcela = this.parcelasRepository.merge(parcela, {
      ...(updateParcelaDto.subsectorId !== undefined
        ? { subsectorId: updateParcelaDto.subsectorId }
        : {}),
      ...(updateParcelaDto.productorId !== undefined
        ? { productorId: updateParcelaDto.productorId }
        : {}),
      ...(updateParcelaDto.code !== undefined && updateParcelaDto.code !== null
        ? { code: updateParcelaDto.code }
        : {}),
      ...(updateParcelaDto.name !== undefined ? { name: updateParcelaDto.name } : {}),
      ...(updateParcelaDto.areaHectares !== undefined
        ? {
            areaHectares: normalizeAreaHectares(updateParcelaDto.areaHectares)
          }
        : {}),
      ...(updateParcelaDto.description !== undefined
        ? { description: updateParcelaDto.description }
        : {}),
      ...(updateParcelaDto.referencePoint !== undefined
        ? {
            referencePoint: validatePointGeometry(updateParcelaDto.referencePoint)
          }
        : {}),
      ...(updateParcelaDto.geometry !== undefined
        ? { geometry: nextGeometry }
        : {}),
      ...(updateParcelaDto.isActive !== undefined
        ? { isActive: updateParcelaDto.isActive }
        : {}),
      updatedAt: new Date()
    });
    updatedParcela.subsector = nextSubsector;

    await this.assertGeodataRules({
      subsectorId: updatedParcela.subsectorId,
      geometry: normalizeGeoJsonMultiPolygon(updatedParcela.geometry),
      excludedId: updatedParcela.id
    });

    try {
      const savedParcela = await this.parcelasRepository.save(updatedParcela);
      savedParcela.subsector = nextSubsector;

      return createSuccessResponse(this.toResponse(savedParcela));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string) {
    const parcela = await this.findEntityById(id);

    if (!parcela.isActive) {
      return createSuccessResponse(this.toResponse(parcela));
    }

    parcela.isActive = false;
    parcela.updatedAt = new Date();

    const savedParcela = await this.parcelasRepository.save(parcela);

    return createSuccessResponse(this.toResponse(savedParcela));
  }

  async getSummary(query: FindParcelasSummaryQueryDto) {
    const queryBuilder = this.parcelasRepository
      .createQueryBuilder("parcela")
      .innerJoin("parcela.subsector", "subsector");

    if (query.productor_id !== undefined) {
      queryBuilder.andWhere("parcela.productor_id = :productorId", {
        productorId: query.productor_id
      });
    }

    if (query.sector_id !== undefined) {
      queryBuilder.andWhere("subsector.sector_id = :sectorId", {
        sectorId: query.sector_id
      });
    }

    if (query.subsector_id !== undefined) {
      queryBuilder.andWhere("parcela.subsector_id = :subsectorId", {
        subsectorId: query.subsector_id
      });
    }

    if (query.activo !== undefined) {
      queryBuilder.andWhere("parcela.activo = :activo", {
        activo: query.activo
      });
    }

    const summary = await queryBuilder
      .select("COUNT(*)", "parcelasCount")
      .addSelect("COALESCE(SUM(parcela.area_ha), 0)", "totalAreaHectares")
      .getRawOne<{
        parcelasCount: string;
        totalAreaHectares: string;
      }>();

    return createSuccessResponse({
      filters: {
        sectorId: query.sector_id ?? null,
        subsectorId: query.subsector_id ?? null,
        productorId: query.productor_id ?? null,
        isActive: query.activo ?? null
      },
      totals: {
        parcelasCount: Number(summary?.parcelasCount ?? 0),
        totalAreaHectares: summary?.totalAreaHectares ?? "0"
      }
    });
  }

  async getHistorialVisitas(id: string, pagination: PaginationQueryDto) {
    return this.visitasCampoService.findHistoryByParcelaId(id, pagination);
  }

  async countByProductorId(productorId: string): Promise<number> {
    const result = await this.parcelasRepository
      .createQueryBuilder("parcela")
      .where("parcela.productor_id = :productorId", {
        productorId
      })
      .getCount();

    return result;
  }

  async findEntitiesBySectorIds(sectorIds: string[]): Promise<ParcelaEntity[]> {
    if (sectorIds.length === 0) {
      return [];
    }

    return this.parcelasRepository
      .createQueryBuilder("parcela")
      .innerJoinAndSelect("parcela.subsector", "subsector")
      .where("subsector.sector_id IN (:...sectorIds)", { sectorIds })
      .orderBy("subsector.sectorId", "ASC")
      .addOrderBy("parcela.code", "ASC")
      .getMany();
  }

  async findEntitiesByProductorId(productorId: string): Promise<ParcelaEntity[]> {
    return this.parcelasRepository.find({
      where: { productorId },
      relations: { subsector: true },
      order: { subsectorId: "ASC", code: "ASC" }
    });
  }

  private createFindEntitiesQueryBuilder(query: {
    sector_id?: string;
    subsector_id?: string;
    productor_id?: string;
    activo?: boolean;
  }) {
    const queryBuilder = this.parcelasRepository
      .createQueryBuilder("parcela")
      .innerJoinAndSelect("parcela.subsector", "subsector");

    if (query.productor_id !== undefined) {
      queryBuilder.andWhere("parcela.productor_id = :productorId", {
        productorId: query.productor_id
      });
    }

    if (query.sector_id !== undefined) {
      queryBuilder.andWhere("subsector.sector_id = :sectorId", {
        sectorId: query.sector_id
      });
    }

    if (query.subsector_id !== undefined) {
      queryBuilder.andWhere("parcela.subsector_id = :subsectorId", {
        subsectorId: query.subsector_id
      });
    }

    if (query.activo !== undefined) {
      queryBuilder.andWhere("parcela.activo = :activo", {
        activo: query.activo
      });
    }

    return queryBuilder
      .orderBy("subsector.sectorId", "ASC")
      .addOrderBy("parcela.subsectorId", "ASC")
      .addOrderBy("parcela.code", "ASC");
  }

  private async findEntityById(id: string) {
    const parcela = await this.parcelasRepository.findOne({
      where: { id },
      relations: { subsector: true }
    });

    if (!parcela) {
      throw new NotFoundException("Parcela not found.");
    }

    return parcela;
  }

  private async ensureSubsectorExists(
    subsectorId: string,
    useNotFoundException = false
  ) {
    const subsector = await this.subsectoresRepository.findOne({
      where: { id: subsectorId }
    });

    if (!subsector) {
      if (useNotFoundException) {
        throw new NotFoundException("Subsector not found.");
      }

      throw new BadRequestException("Subsector not found.");
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

  private async ensureProductorExists(productorId: string) {
    const productor = await this.productoresRepository.findOne({
      where: { id: productorId }
    });

    if (!productor) {
      throw new BadRequestException("Productor not found.");
    }
  }

  private async ensureUniqueCode(
    productorId: string,
    subsectorId: string,
    code: string,
    excludedId?: string
  ) {
    const existingParcela = await this.parcelasRepository.findOne({
      where: {
        productorId,
        subsectorId,
        code
      }
    });

    if (existingParcela && existingParcela.id !== excludedId) {
      throw new ConflictException(
        "A parcela with the same code already exists for this subsector."
      );
    }
  }

  private async generateNextCode(): Promise<string> {
    const [result] = (await this.parcelasRepository.query(
      "SELECT nextval('parcelas_codigo_seq')::bigint AS value"
    )) as { value: string | number }[];
    const sequenceValue = Number(result?.value);

    if (!Number.isSafeInteger(sequenceValue) || sequenceValue < 1) {
      throw new BadRequestException("No se pudo generar el codigo de parcela.");
    }

    return `PAR-${String(sequenceValue).padStart(3, "0")}`;
  }

  private async assertGeodataRules({
    subsectorId,
    geometry,
    excludedId
  }: {
    subsectorId: string;
    geometry: MultiPolygonGeometry | null;
    excludedId?: string;
  }) {
    if (!geometry) {
      return;
    }

    const neighborParcelas = await this.parcelasRepository.find({
      where: {
        subsectorId,
        isActive: true
      }
    });

    assertParcelaGeodataIsPersistable({
      geometry,
      neighborParcelas: neighborParcelas.filter(
        (neighborParcela) => neighborParcela.id !== excludedId
      )
    });
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
        (databaseError.constraint ===
          "parcelas_productor_id_subsector_id_codigo_key" ||
          databaseError.constraint === "uq_parcelas_productor_subsector_codigo")
      ) {
        throw new ConflictException(
          "A parcela with the same code already exists for this productor and subsector."
        );
      }

      if (
        databaseError?.code === "23503" &&
        databaseError.constraint === "parcelas_subsector_id_fkey"
      ) {
        throw new BadRequestException("Subsector not found.");
      }

      if (
        databaseError?.code === "23503" &&
        databaseError.constraint === "parcelas_productor_id_fkey"
      ) {
        throw new BadRequestException("Productor not found.");
      }

      if (
        databaseError?.code === "23514" &&
        databaseError.constraint === "parcelas_area_ha_check"
      ) {
        throw new BadRequestException("areaHectares must be greater than zero.");
      }
    }

    throw error;
  }

  private toResponse(parcela: ParcelaEntity) {
    const referencePoint = normalizeGeoJsonPoint(parcela.referencePoint);
    const geometry = normalizeGeoJsonMultiPolygon(parcela.geometry);
    const sectorId = this.getDerivedSectorId(parcela);

    return {
      id: parcela.id,
      publicId: parcela.publicId,
      productorId: parcela.productorId,
      subsectorId: parcela.subsectorId,
      sectorId,
      code: parcela.code,
      name: parcela.name,
      areaHectares: parcela.areaHectares,
      description: parcela.description,
      referencePoint,
      geometry,
      geo: {
        point: referencePoint,
        polygon: geometry,
        hasGeodata: referencePoint !== null || geometry !== null
      },
      isActive: parcela.isActive,
      createdAt: parcela.createdAt,
      updatedAt: parcela.updatedAt
    };
  }

  private toMapFeatures(parcela: ParcelaEntity) {
    const referencePoint = normalizeGeoJsonPoint(parcela.referencePoint);
    const geometry = normalizeGeoJsonMultiPolygon(parcela.geometry);
    const sectorId = this.getDerivedSectorId(parcela);
    const baseProperties = {
      entityType: "parcela",
      entityId: parcela.id,
      publicId: parcela.publicId,
      productorId: parcela.productorId,
      subsectorId: parcela.subsectorId,
      sectorId,
      code: parcela.code,
      name: parcela.name,
      isActive: parcela.isActive
    };

    return [
      createGeoJsonFeature(
        geometry,
        {
          ...baseProperties,
          geometryRole: "geometry"
        },
        `parcela-${parcela.id}-geometry`
      ),
      createGeoJsonFeature(
        referencePoint,
        {
          ...baseProperties,
          geometryRole: "reference_point"
        },
        `parcela-${parcela.id}-reference-point`
      )
    ];
  }

  private getDerivedSectorId(parcela: ParcelaEntity) {
    if (!parcela.subsector?.sectorId) {
      throw new BadRequestException(
        "No se pudo derivar el sector de la parcela desde su subsector."
      );
    }

    return parcela.subsector.sectorId;
  }
}

function normalizeAreaHectares(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalizedValue = String(value).trim();
  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new BadRequestException("areaHectares must be greater than zero.");
  }

  return normalizedValue;
}

function validatePointGeometry(value: unknown): PointGeometry | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedPoint = normalizeGeoJsonPoint(value);

  if (!normalizedPoint) {
    throw new BadRequestException(
      "referencePoint must be a valid GeoJSON Point with longitude and latitude in SRID 4326."
    );
  }

  return normalizedPoint;
}

function validateMultiPolygonGeometry(
  value: unknown
): MultiPolygonGeometry | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedGeometry = normalizeGeoJsonMultiPolygon(value);

  if (!normalizedGeometry) {
    throw new BadRequestException(
      "geometry must be a valid GeoJSON MultiPolygon with closed linear rings in SRID 4326."
    );
  }

  return normalizedGeometry;
}
