import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { FindOptionsWhere, Repository, SelectQueryBuilder } from "typeorm";
import { QueryFailedError } from "typeorm";

import {
  createPaginatedMeta,
  createSuccessResponse
} from "../../../common/http/api-response";
import {
  createGeoJsonFeature,
  createGeoJsonFeatureCollection,
  normalizeGeoJsonPoint
} from "../../../common/utils/geo-json.util";
import { CampaniaEntity } from "../../campanias/infrastructure/persistence/entities/campania.entity";
import { CultivoEntity } from "../../cultivos/infrastructure/persistence/entities/cultivo.entity";
import { ParcelaEntity } from "../../parcelas/infrastructure/persistence/entities/parcela.entity";
import { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";
import { UserEntity } from "../../users/infrastructure/persistence/entities/user.entity";
import { VariedadEntity } from "../../variedades/infrastructure/persistence/entities/variedad.entity";
import { VisitaEvaluacionEntity } from "../../visita-evaluaciones/infrastructure/persistence/entities/visita-evaluacion.entity";
import { VisitaLaborCulturalEntity } from "../../visita-labores-culturales/infrastructure/persistence/entities/visita-labor-cultural.entity";
import { VisitaObservacionSanitariaEntity } from "../../visita-observaciones-sanitarias/infrastructure/persistence/entities/visita-observacion-sanitaria.entity";
import { VisitaRiegoEntity } from "../../visita-riegos/infrastructure/persistence/entities/visita-riego.entity";
import { CreateVisitaCampoDto } from "../presentation/dto/create-visita-campo.dto";
import { FindHistorialVisitasProductorQueryDto } from "../presentation/dto/find-historial-visitas-productor-query.dto";
import { FindVisitasCampoQueryDto } from "../presentation/dto/find-visitas-campo-query.dto";
import { UpdateVisitaCampoDto } from "../presentation/dto/update-visita-campo.dto";
import { EtapaFenologicaEntity } from "../infrastructure/persistence/entities/etapa-fenologica.entity";
import { SubEtapaEntity } from "../infrastructure/persistence/entities/sub-etapa.entity";
import {
  PointGeometry,
  VisitaCampoEntity
} from "../infrastructure/persistence/entities/visita-campo.entity";

@Injectable()
export class VisitasCampoService {
  constructor(
    @InjectRepository(VisitaCampoEntity)
    private readonly visitasCampoRepository: Repository<VisitaCampoEntity>,
    @InjectRepository(CultivoEntity)
    private readonly cultivosRepository: Repository<CultivoEntity>,
    @InjectRepository(VariedadEntity)
    private readonly variedadesRepository: Repository<VariedadEntity>,
    @InjectRepository(ParcelaEntity)
    private readonly parcelasRepository: Repository<ParcelaEntity>,
    @InjectRepository(CampaniaEntity)
    private readonly campaniasRepository: Repository<CampaniaEntity>,
    @InjectRepository(UserEntity)
    private readonly usuariosRepository: Repository<UserEntity>,
    @InjectRepository(ProductorEntity)
    private readonly productoresRepository: Repository<ProductorEntity>,
    @InjectRepository(EtapaFenologicaEntity)
    private readonly etapasFenologicasRepository: Repository<EtapaFenologicaEntity>,
    @InjectRepository(SubEtapaEntity)
    private readonly subEtapasRepository: Repository<SubEtapaEntity>,
    @InjectRepository(VisitaEvaluacionEntity)
    private readonly visitaEvaluacionesRepository: Repository<VisitaEvaluacionEntity>,
    @InjectRepository(VisitaObservacionSanitariaEntity)
    private readonly observacionesSanitariasRepository: Repository<VisitaObservacionSanitariaEntity>,
    @InjectRepository(VisitaRiegoEntity)
    private readonly visitaRiegosRepository: Repository<VisitaRiegoEntity>,
    @InjectRepository(VisitaLaborCulturalEntity)
    private readonly visitaLaboresRepository: Repository<VisitaLaborCulturalEntity>
  ) {}

  async create(createVisitaCampoDto: CreateVisitaCampoDto) {
    if (createVisitaCampoDto.publicId) {
      const existingVisitaCampo = await this.visitasCampoRepository.findOne({
        where: {
          publicId: createVisitaCampoDto.publicId
        }
      });

      if (existingVisitaCampo) {
        return createSuccessResponse(this.toResponse(existingVisitaCampo));
      }
    }

    await this.validateReferences(createVisitaCampoDto);
    await this.ensureUniqueNroFicha(createVisitaCampoDto.nroFicha ?? null);
    validateVisitTimes(
      createVisitaCampoDto.startVisitTime,
      createVisitaCampoDto.endVisitTime ?? null
    );

    const visitaCampo = this.visitasCampoRepository.create({
      publicId: createVisitaCampoDto.publicId ?? undefined,
      nroFicha: createVisitaCampoDto.nroFicha ?? null,
      cultivoId: createVisitaCampoDto.cropId,
      variedadId: createVisitaCampoDto.varietyId,
      parcelaId: createVisitaCampoDto.parcelaId,
      campaniaId: createVisitaCampoDto.campaignId,
      agronomoUsuarioId: createVisitaCampoDto.agronomistUserId,
      nroPlantas: createVisitaCampoDto.plantsCount ?? null,
      areaHectares: normalizeAreaHectares(createVisitaCampoDto.areaHectares ?? null),
      fechaSiembra: normalizeDateOnly(createVisitaCampoDto.sowingDate ?? null),
      fechaVisita: normalizeRequiredDateOnly(createVisitaCampoDto.visitDate),
      horaVisitaInicio: createVisitaCampoDto.startVisitTime,
      horaVisitaFin: createVisitaCampoDto.endVisitTime ?? null,
      etapaFenologicaId: createVisitaCampoDto.phenologicalStageId ?? null,
      subEtapaId: createVisitaCampoDto.subEtapaId ?? null,
      subEtapaPercentage:
        createVisitaCampoDto.subEtapaPercentage === undefined ||
        createVisitaCampoDto.subEtapaPercentage === null
          ? null
          : String(createVisitaCampoDto.subEtapaPercentage),
      observacionGeneral: createVisitaCampoDto.generalObservation ?? null,
      firmaAgronomoNombre: createVisitaCampoDto.agronomistSignatureName ?? null,
      firmaProductorNombre: createVisitaCampoDto.producerSignatureName ?? null,
      ubicacionVisita: validatePointGeometry(createVisitaCampoDto.visitLocation),
      sincronizadoAt: null,
      isActive: true
    });

    try {
      const savedVisitaCampo = await this.visitasCampoRepository.save(visitaCampo);

      return createSuccessResponse(this.toResponse(savedVisitaCampo));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async findAll(query: FindVisitasCampoQueryDto) {
    validateDateRange(query.fecha_desde, query.fecha_hasta);

    const qb = this.createFindAllQueryBuilder(query);
    qb.skip(query.skip).take(query.take);

    const [visitasCampo, total] = await qb.getManyAndCount();

    return createSuccessResponse(
      visitasCampo.map((visitaCampo) => this.toResponse(visitaCampo)),
      createPaginatedMeta(total, query.page, query.limit)
    );
  }

  async findMap(query: FindVisitasCampoQueryDto) {
    validateDateRange(query.fecha_desde, query.fecha_hasta);

    const qb = this.createFindAllQueryBuilder(query);
    qb.skip(query.skip).take(query.take);

    const [visitasCampo, total] = await qb.getManyAndCount();
    const featureCollection = createGeoJsonFeatureCollection(
      visitasCampo.map((visitaCampo) => this.toMapFeature(visitaCampo))
    );

    return createSuccessResponse(featureCollection, {
      ...createPaginatedMeta(total, query.page, query.limit),
      featuresCount: featureCollection.features.length
    });
  }

  async findById(id: string) {
    const visitaCampo = await this.findEntityById(id);

    return createSuccessResponse(this.toResponse(visitaCampo));
  }

  async getFullDetail(id: string) {
    const visitaCampo = await this.findEntityById(id);
    const [evaluaciones, observacionesSanitarias, riego, laboresCulturales] =
      await Promise.all([
        this.visitaEvaluacionesRepository.find({
          where: {
            visitaId: id
          },
          order: {
            order: "ASC",
            id: "ASC"
          }
        }),
        this.observacionesSanitariasRepository.find({
          where: {
            visitaId: id
          },
          relations: {
            organosAfectados: true
          },
          order: {
            id: "ASC"
          }
        }),
        this.visitaRiegosRepository.findOne({
          where: {
            visitaId: id
          }
        }),
        this.visitaLaboresRepository.find({
          where: {
            visitaId: id
          },
          relations: {
            laborCultural: true
          },
          order: {
            id: "ASC"
          }
        })
      ]);

    return createSuccessResponse({
      visita: this.toResponse(visitaCampo),
      evaluaciones: evaluaciones.map((evaluacion) =>
        this.toEvaluacionResponse(evaluacion)
      ),
      observacionesSanitarias: observacionesSanitarias.map((observacion) =>
        this.toObservacionSanitariaResponse(observacion)
      ),
      riego: riego ? this.toRiegoResponse(riego) : null,
      laboresCulturales: laboresCulturales.map((labor) =>
        this.toLaborCulturalResponse(labor)
      )
    });
  }

  async findHistoryByProductorId(
    productorId: string,
    query: FindHistorialVisitasProductorQueryDto
  ) {
    const productor = await this.findProductorEntityById(productorId);

    validateDateRange(query.fecha_desde, query.fecha_hasta);

    const queryBuilder = this.createHistoryQueryBuilder().where(
      "parcela.productor_id = :productorId",
      {
        productorId
      }
    );

    this.applyHistoryFilters(queryBuilder, query);
    queryBuilder.skip(query.skip).take(query.take);

    const [visitasCampo, total] = await queryBuilder.getManyAndCount();

    return createSuccessResponse(
      {
        productor: this.toProductorSummaryResponse(productor),
        filters: {
          campaignId: query.campania_id ?? null,
          agronomistUserId: query.agronomo_usuario_id ?? null,
          startDate: query.fecha_desde ?? null,
          endDate: query.fecha_hasta ?? null
        },
        visitas: visitasCampo.map((visitaCampo) => this.toResponse(visitaCampo))
      },
      createPaginatedMeta(total, query.page, query.limit)
    );
  }

  async findHistoryByParcelaId(
    parcelaId: string,
    pagination: { skip: number; take: number; page: number; limit: number }
  ) {
    const parcela = await this.findRequiredEntity(
      this.parcelasRepository,
      parcelaId,
      "Parcela not found.",
      true
    );

    const [visitasCampo, total] = await this.visitasCampoRepository.findAndCount({
      where: {
        parcelaId
      },
      order: {
        fechaVisita: "DESC",
        horaVisitaInicio: "DESC",
        id: "DESC"
      },
      skip: pagination.skip,
      take: pagination.take
    });

    return createSuccessResponse(
      {
        parcela: this.toParcelaSummaryResponse(parcela),
        visitas: visitasCampo.map((visitaCampo) => this.toResponse(visitaCampo))
      },
      createPaginatedMeta(total, pagination.page, pagination.limit)
    );
  }

  async update(id: string, updateVisitaCampoDto: UpdateVisitaCampoDto) {
    const visitaCampo = await this.findEntityById(id);
    const nextCropId = updateVisitaCampoDto.cropId ?? visitaCampo.cultivoId;
    const nextVarietyId = updateVisitaCampoDto.varietyId ?? visitaCampo.variedadId;
    const nextCampaignId = updateVisitaCampoDto.campaignId ?? visitaCampo.campaniaId;
    const nextNroFicha =
      updateVisitaCampoDto.nroFicha !== undefined
        ? updateVisitaCampoDto.nroFicha
        : visitaCampo.nroFicha;
    const nextStartVisitTime =
      updateVisitaCampoDto.startVisitTime ?? visitaCampo.horaVisitaInicio;
    const nextEndVisitTime =
      updateVisitaCampoDto.endVisitTime !== undefined
        ? updateVisitaCampoDto.endVisitTime
        : visitaCampo.horaVisitaFin;
    const nextPhenologicalStageId =
      updateVisitaCampoDto.phenologicalStageId !== undefined
        ? updateVisitaCampoDto.phenologicalStageId
        : visitaCampo.etapaFenologicaId;
    const nextSubEtapaId =
      updateVisitaCampoDto.subEtapaId !== undefined
        ? updateVisitaCampoDto.subEtapaId
        : visitaCampo.subEtapaId;
    const nextSubEtapaPercentage =
      updateVisitaCampoDto.subEtapaPercentage !== undefined
        ? updateVisitaCampoDto.subEtapaPercentage
        : visitaCampo.subEtapaPercentage === null
          ? null
          : Number(visitaCampo.subEtapaPercentage);

    await this.validateReferences({
      cropId: nextCropId,
      varietyId: nextVarietyId,
      parcelaId: updateVisitaCampoDto.parcelaId ?? visitaCampo.parcelaId,
      campaignId: nextCampaignId,
      agronomistUserId:
        updateVisitaCampoDto.agronomistUserId ?? visitaCampo.agronomoUsuarioId,
      phenologicalStageId: nextPhenologicalStageId ?? undefined,
      subEtapaId: nextSubEtapaId ?? undefined,
      subEtapaPercentage: nextSubEtapaPercentage
    });

    await this.ensureUniqueNroFicha(nextNroFicha ?? null, visitaCampo.id);
    validateVisitTimes(nextStartVisitTime, nextEndVisitTime ?? null);

    const updatedVisitaCampo = this.visitasCampoRepository.merge(visitaCampo, {
      ...(updateVisitaCampoDto.nroFicha !== undefined
        ? { nroFicha: updateVisitaCampoDto.nroFicha }
        : {}),
      ...(updateVisitaCampoDto.cropId !== undefined
        ? { cultivoId: updateVisitaCampoDto.cropId }
        : {}),
      ...(updateVisitaCampoDto.varietyId !== undefined
        ? { variedadId: updateVisitaCampoDto.varietyId }
        : {}),
      ...(updateVisitaCampoDto.parcelaId !== undefined
        ? { parcelaId: updateVisitaCampoDto.parcelaId }
        : {}),
      ...(updateVisitaCampoDto.campaignId !== undefined
        ? { campaniaId: updateVisitaCampoDto.campaignId }
        : {}),
      ...(updateVisitaCampoDto.agronomistUserId !== undefined
        ? { agronomoUsuarioId: updateVisitaCampoDto.agronomistUserId }
        : {}),
      ...(updateVisitaCampoDto.plantsCount !== undefined
        ? { nroPlantas: updateVisitaCampoDto.plantsCount }
        : {}),
      ...(updateVisitaCampoDto.areaHectares !== undefined
        ? {
            areaHectares: normalizeAreaHectares(updateVisitaCampoDto.areaHectares)
          }
        : {}),
      ...(updateVisitaCampoDto.sowingDate !== undefined
        ? { fechaSiembra: normalizeDateOnly(updateVisitaCampoDto.sowingDate) }
        : {}),
      ...(updateVisitaCampoDto.visitDate !== undefined
        ? { fechaVisita: normalizeRequiredDateOnly(updateVisitaCampoDto.visitDate) }
        : {}),
      ...(updateVisitaCampoDto.startVisitTime !== undefined
        ? { horaVisitaInicio: updateVisitaCampoDto.startVisitTime }
        : {}),
      ...(updateVisitaCampoDto.endVisitTime !== undefined
        ? { horaVisitaFin: updateVisitaCampoDto.endVisitTime }
        : {}),
      ...(updateVisitaCampoDto.phenologicalStageId !== undefined
        ? { etapaFenologicaId: updateVisitaCampoDto.phenologicalStageId }
        : {}),
      ...(updateVisitaCampoDto.subEtapaId !== undefined
        ? { subEtapaId: updateVisitaCampoDto.subEtapaId }
        : {}),
      ...(updateVisitaCampoDto.subEtapaPercentage !== undefined
        ? {
            subEtapaPercentage:
              updateVisitaCampoDto.subEtapaPercentage === null
                ? null
                : String(updateVisitaCampoDto.subEtapaPercentage)
          }
        : {}),
      ...(updateVisitaCampoDto.generalObservation !== undefined
        ? { observacionGeneral: updateVisitaCampoDto.generalObservation }
        : {}),
      ...(updateVisitaCampoDto.agronomistSignatureName !== undefined
        ? {
            firmaAgronomoNombre: updateVisitaCampoDto.agronomistSignatureName
          }
        : {}),
      ...(updateVisitaCampoDto.producerSignatureName !== undefined
        ? {
            firmaProductorNombre: updateVisitaCampoDto.producerSignatureName
          }
        : {}),
      ...(updateVisitaCampoDto.visitLocation !== undefined
        ? {
            ubicacionVisita: validatePointGeometry(updateVisitaCampoDto.visitLocation)
          }
        : {}),
      updatedAt: new Date()
    });

    try {
      const savedVisitaCampo = await this.visitasCampoRepository.save(updatedVisitaCampo);

      return createSuccessResponse(this.toResponse(savedVisitaCampo));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string) {
    const visitaCampo = await this.findEntityById(id);

    if (!visitaCampo.isActive) {
      return createSuccessResponse(this.toResponse(visitaCampo));
    }

    visitaCampo.isActive = false;
    visitaCampo.updatedAt = new Date();

    const savedVisitaCampo = await this.visitasCampoRepository.save(visitaCampo);

    return createSuccessResponse(this.toResponse(savedVisitaCampo));
  }

  private async findEntityById(id: string) {
    const visitaCampo = await this.visitasCampoRepository.findOne({
      where: { id }
    });

    if (!visitaCampo) {
      throw new NotFoundException("Visita de campo not found.");
    }

    return visitaCampo;
  }

  private async validateReferences(input: {
    cropId: string;
    varietyId: string;
    parcelaId: string;
    campaignId: string;
    agronomistUserId: string;
    phenologicalStageId?: string | null;
    subEtapaId?: string | null;
    subEtapaPercentage?: number | null;
  }) {
    await this.findRequiredEntity(
      this.cultivosRepository,
      input.cropId,
      "Cultivo not found."
    );
    const variedad = await this.findRequiredEntity(
      this.variedadesRepository,
      input.varietyId,
      "Variedad not found."
    );
    await this.findRequiredEntity(
      this.parcelasRepository,
      input.parcelaId,
      "Parcela not found."
    );
    const campania = await this.findRequiredEntity(
      this.campaniasRepository,
      input.campaignId,
      "Campania not found."
    );
    await this.findRequiredEntity(
      this.usuariosRepository,
      input.agronomistUserId,
      "Agronomo user not found."
    );

    if (variedad.cultivoId !== input.cropId) {
      throw new BadRequestException("Variedad does not belong to the selected cultivo.");
    }

    if (campania.cultivoId !== input.cropId) {
      throw new BadRequestException("Campania does not belong to the selected cultivo.");
    }

    if (input.phenologicalStageId === undefined || input.phenologicalStageId === null) {
      if (
        (input.subEtapaId !== undefined && input.subEtapaId !== null) ||
        (input.subEtapaPercentage !== undefined && input.subEtapaPercentage !== null)
      ) {
        throw new BadRequestException("Sub etapa requires a phenological stage.");
      }

      return;
    }

    const etapaFenologica = await this.findRequiredEntity(
      this.etapasFenologicasRepository,
      input.phenologicalStageId,
      "Etapa fenologica not found."
    );

    if (etapaFenologica.cultivoId !== input.cropId) {
      throw new BadRequestException(
        "Etapa fenologica does not belong to the selected cultivo."
      );
    }

    if (input.subEtapaId === undefined || input.subEtapaId === null) {
      if (input.subEtapaPercentage !== undefined && input.subEtapaPercentage !== null) {
        throw new BadRequestException("subEtapaPercentage requires a sub etapa.");
      }

      return;
    }

    if (etapaFenologica.type !== "Etapa") {
      throw new BadRequestException(
        "Sub etapa can only be used with a phenological stage of type Etapa."
      );
    }

    const subEtapa = await this.findRequiredEntity(
      this.subEtapasRepository,
      input.subEtapaId,
      "Sub etapa not found."
    );

    if (subEtapa.etapaFenologicaId !== input.phenologicalStageId) {
      throw new BadRequestException(
        "Sub etapa does not belong to the selected phenological stage."
      );
    }
  }

  private async ensureUniqueNroFicha(nroFicha: string | null, excludedId?: string) {
    if (nroFicha === null) {
      return;
    }

    const existingVisitaCampo = await this.visitasCampoRepository.findOne({
      where: {
        nroFicha
      } as FindOptionsWhere<VisitaCampoEntity>
    });

    if (existingVisitaCampo && existingVisitaCampo.id !== excludedId) {
      throw new ConflictException(
        "A visita de campo with the same nroFicha already exists."
      );
    }
  }

  private async findRequiredEntity<T extends { id: string | number }>(
    repository: Repository<T>,
    id: string,
    message: string,
    useNotFoundException = false
  ) {
    const entity = await repository.findOne({
      where: { id } as FindOptionsWhere<T>
    });

    if (!entity) {
      if (useNotFoundException) {
        throw new NotFoundException(message);
      }

      throw new BadRequestException(message);
    }

    return entity;
  }

  private async findProductorEntityById(id: string) {
    const productor = await this.productoresRepository.findOne({
      where: { id }
    });

    if (!productor) {
      throw new NotFoundException("Productor not found.");
    }

    return productor;
  }

  private createFindAllQueryBuilder(query: FindVisitasCampoQueryDto) {
    const queryBuilder = this.visitasCampoRepository.createQueryBuilder("visita");

    if (query.productor_id !== undefined) {
      queryBuilder.innerJoin(ParcelaEntity, "parcela", "parcela.id = visita.parcela_id");
      queryBuilder.andWhere("parcela.productor_id = :productorId", {
        productorId: query.productor_id
      });
    }

    if (query.parcela_id !== undefined) {
      queryBuilder.andWhere("visita.parcela_id = :parcelaId", {
        parcelaId: query.parcela_id
      });
    }

    if (query.campania_id !== undefined) {
      queryBuilder.andWhere("visita.campania_id = :campaniaId", {
        campaniaId: query.campania_id
      });
    }

    if (query.agronomo_usuario_id !== undefined) {
      queryBuilder.andWhere("visita.agronomo_usuario_id = :agronomistUserId", {
        agronomistUserId: query.agronomo_usuario_id
      });
    }

    if (query.fecha_desde !== undefined) {
      queryBuilder.andWhere("visita.fecha_visita >= :startDate", {
        startDate: query.fecha_desde
      });
    }

    if (query.fecha_hasta !== undefined) {
      queryBuilder.andWhere("visita.fecha_visita <= :endDate", {
        endDate: query.fecha_hasta
      });
    }

    if (query.activo !== undefined) {
      queryBuilder.andWhere("visita.activo = :isActive", {
        isActive: query.activo
      });
    }

    return queryBuilder
      .orderBy("visita.fecha_visita", "DESC")
      .addOrderBy("visita.hora_visita_inicio", "DESC")
      .addOrderBy("visita.id", "DESC");
  }

  private createHistoryQueryBuilder() {
    return this.visitasCampoRepository
      .createQueryBuilder("visita")
      .innerJoin(ParcelaEntity, "parcela", "parcela.id = visita.parcela_id")
      .orderBy("visita.fecha_visita", "DESC")
      .addOrderBy("visita.hora_visita_inicio", "DESC")
      .addOrderBy("visita.id", "DESC");
  }

  private applyHistoryFilters(
    queryBuilder: SelectQueryBuilder<VisitaCampoEntity>,
    query: FindHistorialVisitasProductorQueryDto
  ) {
    if (query.campania_id !== undefined) {
      queryBuilder.andWhere("visita.campania_id = :campaignId", {
        campaignId: query.campania_id
      });
    }

    if (query.agronomo_usuario_id !== undefined) {
      queryBuilder.andWhere("visita.agronomo_usuario_id = :agronomistUserId", {
        agronomistUserId: query.agronomo_usuario_id
      });
    }

    if (query.fecha_desde !== undefined) {
      queryBuilder.andWhere("visita.fecha_visita >= :startDate", {
        startDate: query.fecha_desde
      });
    }

    if (query.fecha_hasta !== undefined) {
      queryBuilder.andWhere("visita.fecha_visita <= :endDate", {
        endDate: query.fecha_hasta
      });
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
        databaseError.constraint === "visitas_campo_nro_ficha_key"
      ) {
        throw new ConflictException(
          "A visita de campo with the same nroFicha already exists."
        );
      }

      if (
        databaseError?.code === "23514" &&
        databaseError.constraint === "visitas_campo_nro_plantas_check"
      ) {
        throw new BadRequestException(
          "plantsCount must be greater than or equal to zero."
        );
      }

      if (
        databaseError?.code === "23514" &&
        databaseError.constraint === "visitas_campo_area_ha_check"
      ) {
        throw new BadRequestException("areaHectares must be greater than zero.");
      }

      if (
        databaseError?.code === "23514" &&
        databaseError.constraint === "visitas_campo_sub_etapa_porcentaje_check"
      ) {
        throw new BadRequestException("subEtapaPercentage must be between 0 and 100.");
      }

      if (databaseError?.code === "23503") {
        switch (databaseError.constraint) {
          case "visitas_campo_cultivo_id_fkey":
            throw new BadRequestException("Cultivo not found.");
          case "visitas_campo_variedad_id_fkey":
            throw new BadRequestException("Variedad not found.");
          case "visitas_campo_parcela_id_fkey":
            throw new BadRequestException("Parcela not found.");
          case "visitas_campo_campania_id_fkey":
            throw new BadRequestException("Campania not found.");
          case "visitas_campo_agronomo_usuario_id_fkey":
            throw new BadRequestException("Agronomo user not found.");
          case "visitas_campo_etapa_fenologica_id_fkey":
            throw new BadRequestException("Etapa fenologica not found.");
          case "visitas_campo_sub_etapa_id_fkey":
            throw new BadRequestException("Sub etapa not found.");
        }
      }
    }

    throw error;
  }

  private toResponse(visitaCampo: VisitaCampoEntity) {
    const visitLocation = normalizeGeoJsonPoint(visitaCampo.ubicacionVisita);

    return {
      id: visitaCampo.id,
      publicId: visitaCampo.publicId,
      nroFicha: visitaCampo.nroFicha,
      cropId: visitaCampo.cultivoId,
      varietyId: visitaCampo.variedadId,
      parcelaId: visitaCampo.parcelaId,
      campaignId: visitaCampo.campaniaId,
      agronomistUserId: visitaCampo.agronomoUsuarioId,
      plantsCount: visitaCampo.nroPlantas,
      areaHectares: visitaCampo.areaHectares,
      sowingDate: normalizeDateOnly(visitaCampo.fechaSiembra),
      visitDate: normalizeRequiredDateOnly(visitaCampo.fechaVisita),
      startVisitTime: visitaCampo.horaVisitaInicio,
      endVisitTime: visitaCampo.horaVisitaFin,
      phenologicalStageId: visitaCampo.etapaFenologicaId,
      subEtapaId: visitaCampo.subEtapaId,
      subEtapaPercentage:
        visitaCampo.subEtapaPercentage === null
          ? null
          : Number(visitaCampo.subEtapaPercentage),
      generalObservation: visitaCampo.observacionGeneral,
      agronomistSignatureName: visitaCampo.firmaAgronomoNombre,
      producerSignatureName: visitaCampo.firmaProductorNombre,
      visitLocation,
      geo: {
        point: visitLocation,
        hasGeodata: visitLocation !== null
      },
      synchronizedAt: visitaCampo.sincronizadoAt,
      isActive: visitaCampo.isActive,
      createdAt: visitaCampo.createdAt,
      updatedAt: visitaCampo.updatedAt
    };
  }

  private toMapFeature(visitaCampo: VisitaCampoEntity) {
    const visitLocation = normalizeGeoJsonPoint(visitaCampo.ubicacionVisita);

    return createGeoJsonFeature(
      visitLocation,
      {
        entityType: "visita_campo",
        entityId: visitaCampo.id,
        publicId: visitaCampo.publicId,
        nroFicha: visitaCampo.nroFicha,
        parcelaId: visitaCampo.parcelaId,
        campaignId: visitaCampo.campaniaId,
        agronomistUserId: visitaCampo.agronomoUsuarioId,
        visitDate: normalizeRequiredDateOnly(visitaCampo.fechaVisita),
        isActive: visitaCampo.isActive,
        geometryRole: "visit_location"
      },
      `visita-campo-${visitaCampo.id}-location`
    );
  }

  private toEvaluacionResponse(visitaEvaluacion: VisitaEvaluacionEntity) {
    return {
      id: visitaEvaluacion.id,
      visitaId: visitaEvaluacion.visitaId,
      order: visitaEvaluacion.order,
      incidencePercentage: visitaEvaluacion.incidencePercentage,
      percentage: visitaEvaluacion.percentage,
      description: visitaEvaluacion.description,
      organosAfectados: visitaEvaluacion.organosAfectados ?? []
    };
  }

  private toObservacionSanitariaResponse(observacion: VisitaObservacionSanitariaEntity) {
    return {
      id: observacion.id,
      visitaId: observacion.visitaId,
      pestDiseaseId: observacion.plagaEnfermedadId,
      incidenceLevelId: observacion.nivelIncidenciaId,
      severityLevelId: observacion.nivelSeveridadId,
      incidencePercentage: observacion.incidencePercentage,
      observation: observacion.observation,
      organosAfectados: (observacion.organosAfectados ?? [])
        .map((organo) => organo.organo)
        .sort()
    };
  }

  private toRiegoResponse(riego: VisitaRiegoEntity) {
    return {
      id: riego.id,
      visitaId: riego.visitaId,
      tipoRiegoId: riego.tipoRiegoId
    };
  }

  private toLaborCulturalResponse(labor: VisitaLaborCulturalEntity) {
    return {
      id: labor.id,
      visitaId: labor.visitaId,
      laborCulturalId: labor.laborCulturalId,
      laborCultural: labor.laborCultural
        ? {
            id: labor.laborCultural.id,
            name: labor.laborCultural.name,
            description: labor.laborCultural.description,
            categoryCode: labor.laborCultural.categoryCode,
            categoryName: labor.laborCultural.categoryName,
            optionCode: labor.laborCultural.optionCode,
            optionLabel: labor.laborCultural.optionLabel,
            legend: labor.laborCultural.legend,
            sortOrder: labor.laborCultural.sortOrder,
            isActive: labor.laborCultural.isActive
          }
        : null
    };
  }

  private toProductorSummaryResponse(productor: ProductorEntity) {
    return {
      id: productor.id,
      publicId: productor.publicId,
      documentTypeId: productor.documentTypeId,
      documentNumber: productor.documentNumber,
      firstName: productor.firstName,
      lastName: productor.lastName,
      email: productor.email,
      isActive: productor.isActive
    };
  }

  private toParcelaSummaryResponse(parcela: ParcelaEntity) {
    return {
      id: parcela.id,
      publicId: parcela.publicId,
      productorId: parcela.productorId,
      sectorId: parcela.sectorId,
      code: parcela.code,
      name: parcela.name,
      isActive: parcela.isActive
    };
  }
}

function validateVisitTimes(startVisitTime: string, endVisitTime: string | null) {
  if (!endVisitTime) {
    return;
  }

  if (endVisitTime < startVisitTime) {
    throw new BadRequestException(
      "startVisitTime must be less than or equal to endVisitTime."
    );
  }
}

function validateDateRange(startDate: string | undefined, endDate: string | undefined) {
  if (!startDate || !endDate) {
    return;
  }

  if (startDate > endDate) {
    throw new BadRequestException(
      "fecha_hasta must be greater than or equal to fecha_desde."
    );
  }
}

function normalizeRequiredDateOnly(value: unknown): string {
  const normalizedValue = normalizeDateOnly(value);

  if (!normalizedValue) {
    throw new BadRequestException("Date value is required.");
  }

  return normalizedValue;
}

function normalizeDateOnly(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return `${value.getUTCFullYear()}-${padDatePart(value.getUTCMonth() + 1)}-${padDatePart(value.getUTCDate())}`;
  }

  const normalizedValue = String(value).trim();
  const dateOnlyMatch = normalizedValue.match(/^(\d{4}-\d{2}-\d{2})/);

  return dateOnlyMatch?.[1] ?? normalizedValue;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
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
      "visitLocation must be a valid GeoJSON Point with longitude and latitude in SRID 4326."
    );
  }

  return normalizedPoint;
}
