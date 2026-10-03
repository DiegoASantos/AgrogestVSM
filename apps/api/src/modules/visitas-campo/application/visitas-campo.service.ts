import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import ExcelJS from "exceljs";
import type { FindOptionsWhere, Repository, SelectQueryBuilder } from "typeorm";
import { Between, QueryFailedError } from "typeorm";
import { VisitaEtapaFenologicaEntity } from "../infrastructure/persistence/entities/visita-etapa-fenologica.entity";
import { VisitaEtapaFenologicaDto } from "../presentation/dto/visita-etapa-fenologica.dto";

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
import { VisitaCalificacionEntity } from "../../visita-calificaciones/infrastructure/persistence/entities/visita-calificacion.entity";
import { VisitaEvaluacionEntity } from "../../visita-evaluaciones/infrastructure/persistence/entities/visita-evaluacion.entity";
import { VisitaLaborCulturalEntity } from "../../visita-labores-culturales/infrastructure/persistence/entities/visita-labor-cultural.entity";
import { VisitaObservacionSanitariaEntity } from "../../visita-observaciones-sanitarias/infrastructure/persistence/entities/visita-observacion-sanitaria.entity";
import { VisitaRiegoEntity } from "../../visita-riegos/infrastructure/persistence/entities/visita-riego.entity";
import { CreateVisitaCampoDto } from "../presentation/dto/create-visita-campo.dto";
import { ExportVisitasExcelQueryDto } from "../presentation/dto/export-visitas-excel-query.dto";
import { FindHistorialVisitasProductorQueryDto } from "../presentation/dto/find-historial-visitas-productor-query.dto";
import { FindVisitasCampoQueryDto } from "../presentation/dto/find-visitas-campo-query.dto";
import { UpdateVisitaCampoDto } from "../presentation/dto/update-visita-campo.dto";
import { EtapaFenologicaEntity } from "../infrastructure/persistence/entities/etapa-fenologica.entity";
import { SubEtapaEntity } from "../infrastructure/persistence/entities/sub-etapa.entity";
import {
  PointGeometry,
  VisitaCampoEntity
} from "../infrastructure/persistence/entities/visita-campo.entity";

type CurrentUserContext = {
  userId: string;
  roles: string[];
};

type VisitasExcelReport = {
  content: Buffer;
  fileName: string;
};

type ExcelDiagnosisRow = {
  pest: string;
  disease: string;
  nutrition: string;
};

type StageEntry = {
  phenologicalStageId: string;
  subEtapaId: string | null;
  coveragePercentage: number | null;
  laborProgressPercentage: number | null;
};

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
    private readonly visitaLaboresRepository: Repository<VisitaLaborCulturalEntity>,
    @InjectRepository(VisitaCalificacionEntity)
    private readonly visitaCalificacionesRepository: Repository<VisitaCalificacionEntity>
  ) {}

  async create(
    createVisitaCampoDto: CreateVisitaCampoDto,
    currentUser?: CurrentUserContext
  ) {
    const normalizedDto = isAgronomoUser(currentUser)
      ? { ...createVisitaCampoDto, agronomistUserId: currentUser!.userId }
      : createVisitaCampoDto;

    if (createVisitaCampoDto.publicId) {
      const existingVisitaCampo = await this.visitasCampoRepository.findOne({
        where: {
          publicId: createVisitaCampoDto.publicId
        },
        relations: { phenologicalStages: { stage: true, subStage: true } }
      });

      if (existingVisitaCampo) {
        if (
          isAgronomoUser(currentUser) &&
          existingVisitaCampo.agronomoUsuarioId !== currentUser!.userId
        ) {
          throw new NotFoundException("Visita de campo not found.");
        }

        return createSuccessResponse(this.toResponse(existingVisitaCampo));
      }
    }

    await this.validateReferences(normalizedDto, currentUser);
    const stageEntries = await this.validateStageEntries(
      normalizedDto.phenologicalStages,
      normalizedDto.cropId,
      normalizedDto.phenologicalStageId,
      normalizedDto.subEtapaId ?? null,
      normalizedDto.subEtapaPercentage ?? null
    );
    const primaryStage = selectPrimaryStage(stageEntries);
    await this.ensureUniqueNroFicha(normalizedDto.nroFicha ?? null);
    validateVisitTimes(normalizedDto.startVisitTime, normalizedDto.endVisitTime ?? null);

    const visitaCampo = this.visitasCampoRepository.create({
      publicId: normalizedDto.publicId ?? undefined,
      nroFicha: normalizedDto.nroFicha ?? null,
      cultivoId: normalizedDto.cropId,
      variedadId: normalizedDto.varietyId,
      parcelaId: normalizedDto.parcelaId,
      campaniaId: normalizedDto.campaignId,
      agronomoUsuarioId: normalizedDto.agronomistUserId,
      nroPlantas: normalizedDto.plantsCount ?? null,
      areaHectares: normalizeAreaHectares(normalizedDto.areaHectares ?? null),
      fechaSiembra: normalizeDateOnly(normalizedDto.sowingDate ?? null),
      fechaVisita: normalizeRequiredDateOnly(normalizedDto.visitDate),
      horaVisitaInicio: normalizedDto.startVisitTime,
      horaVisitaFin: normalizedDto.endVisitTime ?? null,
      etapaFenologicaId: primaryStage.phenologicalStageId,
      subEtapaId: primaryStage.subEtapaId,
      subEtapaPercentage:
        normalizedDto.phenologicalStages
          ? (primaryStage.laborProgressPercentage !== null
              ? String(primaryStage.laborProgressPercentage)
              : normalizedDto.subEtapaPercentage === undefined || normalizedDto.subEtapaPercentage === null
                ? null : String(normalizedDto.subEtapaPercentage))
          : normalizedDto.subEtapaPercentage === undefined ||
            normalizedDto.subEtapaPercentage === null
            ? null
            : String(normalizedDto.subEtapaPercentage),
      observacionGeneral: normalizedDto.generalObservation ?? null,
      firmaAgronomoNombre: normalizedDto.agronomistSignatureName ?? null,
      firmaProductorNombre: normalizedDto.producerSignatureName ?? null,
      ubicacionVisita: validatePointGeometry(normalizedDto.visitLocation),
      sincronizadoAt: null,
      isActive: true,
      technicalScoreVersion: normalizedDto.technicalScoreVersion ?? 2
    });

    try {
      const savedVisitaCampo = await this.visitasCampoRepository.manager.transaction(async (manager) => {
        const saved = await manager.save(visitaCampo);
        saved.phenologicalStages = await manager.getRepository(VisitaEtapaFenologicaEntity).save(
          stageEntries.map((entry, order) => ({
            visitaId: saved.id,
            etapaFenologicaId: entry.phenologicalStageId,
            subEtapaId: entry.subEtapaId,
            coveragePercentage: entry.coveragePercentage,
            laborProgressPercentage: entry.laborProgressPercentage === null ? null : String(entry.laborProgressPercentage),
            order
          }))
        );
        return saved;
      });

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
    const visitaCampo = await this.findActiveEntityById(id);
    const [
      evaluaciones,
      observacionesSanitarias,
      riego,
      laboresCulturales,
      calificaciones,
      etapaFenologica
    ] = await Promise.all([
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
      }),
      this.visitaCalificacionesRepository.find({
        where: {
          visitaId: id
        },
        order: {
          modulo: "ASC",
          id: "ASC"
        }
      }),
      visitaCampo.etapaFenologicaId
        ? this.etapasFenologicasRepository.findOne({
            where: { id: visitaCampo.etapaFenologicaId }
          })
        : Promise.resolve(null)
    ]);

    return createSuccessResponse({
      visita: {
        ...this.toResponse(visitaCampo),
        etapaFenologicaNombre: etapaFenologica?.name ?? null
      },
      evaluaciones: evaluaciones.map((evaluacion) =>
        this.toEvaluacionResponse(evaluacion)
      ),
      observacionesSanitarias: observacionesSanitarias.map((observacion) =>
        this.toObservacionSanitariaResponse(observacion)
      ),
      riego: riego ? this.toRiegoResponse(riego) : null,
      laboresCulturales: laboresCulturales.map((labor) =>
        this.toLaborCulturalResponse(labor)
      ),
      calificaciones: calificaciones.map((calificacion) =>
        this.toCalificacionResponse(calificacion)
      )
    });
  }

  async exportExcelReport(
    query: ExportVisitasExcelQueryDto,
    currentUser?: CurrentUserContext
  ): Promise<VisitasExcelReport> {
    validateDateRange(query.fecha_desde, query.fecha_hasta);

    const agronomistUserId = isAgronomoUser(currentUser)
      ? currentUser!.userId
      : query.agronomo_usuario_id;

    const where: FindOptionsWhere<VisitaCampoEntity> = {
      isActive: true,
      fechaVisita: Between(query.fecha_desde, query.fecha_hasta)
    };

    if (agronomistUserId) {
      where.agronomoUsuarioId = agronomistUserId;
    }

    const visitas = await this.visitasCampoRepository.find({
      where,
      relations: {
        agronomoUsuario: true,
        cultivo: true,
        etapaFenologica: true,
        phenologicalStages: { stage: true, subStage: true },
        observacionesSanitarias: {
          plagaEnfermedad: true
        },
        evaluaciones: {
          nutrient: true
        },
        riego: true,
        parcela: {
          productor: true,
          subsector: {
            sector: true
          }
        }
      },
      order: {
        fechaVisita: "ASC",
        horaVisitaInicio: "ASC",
        id: "ASC"
      }
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AgroGest VSM";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Visitas");
    worksheet.mergeCells("A1:R1");
    worksheet.getCell("A1").value = "Reporte de visitas de campo";
    worksheet.getCell("A1").font = { bold: true, size: 15, color: { argb: "FFFFFFFF" } };
    worksheet.getCell("A1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF166534" }
    };
    worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 28;
    worksheet.mergeCells("A2:R2");
    worksheet.getCell("A2").value =
      `Periodo: ${query.fecha_desde} al ${query.fecha_hasta}`;
    worksheet.getCell("A2").font = { bold: true, color: { argb: "FF166534" } };
    worksheet.getCell("A2").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF0FDF4" }
    };
    worksheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(2).height = 22;
    worksheet.mergeCells("A3:R3");
    worksheet.getCell("A3").value = `Agrónomo: ${
      agronomistUserId ? "seleccionado" : "Todos"
    } | Visitas activas: ${visitas.length}`;
    worksheet.getCell("A3").font = { italic: true, color: { argb: "FF475569" } };
    worksheet.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(3).height = 20;

    const headers = [
      "Fecha",
      "N.° ficha",
      "Cultivo",
      "Agrónomo",
      "Productor",
      "Sector",
      "Subsector",
      "Parcela",
      "Hora inicio",
      "Hora fin",
      "Distribución fenológica",
      "Avance histórico de subetapa",
      "Plagas",
      "Enfermedades",
      "Nutrición",
      "Humedad del suelo",
      "Estrés hídrico intencional",
      "Estado"
    ];
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 32;

    for (let column = 1; column <= headers.length; column += 1) {
      const cell = headerRow.getCell(column);

      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2F6B4F" }
      };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FF1E4D38" } },
        left: { style: "thin", color: { argb: "FF1E4D38" } },
        bottom: { style: "thin", color: { argb: "FF1E4D38" } },
        right: { style: "thin", color: { argb: "FF1E4D38" } }
      };
    }

    const reportColumnFills: Record<number, string> = {
      13: "FFFFF7ED",
      14: "FFFEF2F2",
      15: "FFECFDF5",
      16: "FFEFF6FF",
      17: "FFEFF6FF",
      18: "FFF0FDF4"
    };

    for (const visita of visitas) {
      const diagnosisRows = buildExcelDiagnosisRows(visita);
      const firstWorksheetRow = worksheet.rowCount + 1;

      for (const [index, diagnosis] of diagnosisRows.entries()) {
        worksheet.addRow([
          index === 0 ? toWorksheetText(visita.fechaVisita) : "",
          index === 0 ? toWorksheetText(buildFriendlyVisitNumber(visita.id)) : "",
          index === 0 ? toWorksheetText(visita.cultivo?.name ?? "No registrado") : "",
          index === 0 ? toWorksheetText(buildUserLabel(visita.agronomoUsuario)) : "",
          index === 0
            ? toWorksheetText(buildProductorLabel(visita.parcela?.productor))
            : "",
          index === 0
            ? toWorksheetText(visita.parcela?.subsector?.sector?.name ?? "No registrado")
            : "",
          index === 0
            ? toWorksheetText(visita.parcela?.subsector?.name ?? "No registrado")
            : "",
          index === 0 ? toWorksheetText(buildParcelaLabel(visita.parcela)) : "",
          index === 0 ? toWorksheetText(visita.horaVisitaInicio) : "",
          index === 0 ? toWorksheetText(visita.horaVisitaFin ?? "No registrado") : "",
          index === 0 ? toWorksheetText(buildStageExcelLabel(visita)) : "",
          index === 0
            ? visita.subEtapaPercentage === null ||
                (visita.phenologicalStages?.length > 0 && !visita.phenologicalStages.some((entry) => entry.coveragePercentage !== null))
              ? "---"
              : Number(visita.subEtapaPercentage) / 100
            : "",
          toWorksheetText(diagnosis.pest),
          toWorksheetText(diagnosis.disease),
          toWorksheetText(diagnosis.nutrition),
          index === 0
            ? toWorksheetText(visita.riego?.[0]?.humedadSuelo ?? "No registrado")
            : "",
          index === 0
            ? toWorksheetText(visita.riego?.[0]?.estresHidrico ? "Sí" : "No")
            : "",
          index === 0 ? "Activa" : ""
        ]);
      }

      const lastWorksheetRow = worksheet.rowCount;

      for (let row = firstWorksheetRow; row <= lastWorksheetRow; row += 1) {
        const worksheetRow = worksheet.getRow(row);
        worksheetRow.height = 23;

        for (let column = 1; column <= headers.length; column += 1) {
          const cell = worksheetRow.getCell(column);
          const columnFill = reportColumnFills[column];

          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } }
          };
          cell.alignment = {
            ...(cell.alignment ?? {}),
            ...(column >= 13 && column <= 15 ? { horizontal: "center" as const } : {}),
            vertical: "middle",
            wrapText: true
          };

          if (column === 12 && typeof cell.value === "number") {
            cell.numFmt = "0%";
          }

          if (columnFill) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: columnFill }
            };
          }
        }
      }

      for (const column of [
        ...Array.from({ length: 12 }, (_, index) => index + 1),
        16,
        17,
        18
      ]) {
        if (lastWorksheetRow > firstWorksheetRow) {
          worksheet.mergeCells(firstWorksheetRow, column, lastWorksheetRow, column);
        }

        worksheet.getCell(firstWorksheetRow, column).alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true
        };
      }

      for (const column of [13, 14, 15]) {
        mergeAndCenterSingleDiagnosis(
          worksheet,
          firstWorksheetRow,
          lastWorksheetRow,
          column
        );
      }
    }

    worksheet.columns = [
      { width: 14 },
      { width: 18 },
      { width: 22 },
      { width: 26 },
      { width: 28 },
      { width: 22 },
      { width: 22 },
      { width: 28 },
      { width: 14 },
      { width: 14 },
      { width: 24 },
      { width: 22 },
      { width: 28 },
      { width: 28 },
      { width: 28 },
      { width: 24 },
      { width: 26 },
      { width: 12 }
    ];
    worksheet.views = [{ state: "frozen", ySplit: 4 }];
    worksheet.autoFilter = { from: "A4", to: "R4" };

    return {
      content: Buffer.from(await workbook.xlsx.writeBuffer()),
      fileName: `reporte-visitas_${query.fecha_desde}_${query.fecha_hasta}.xlsx`
    };
  }

  async findHistoryByProductorId(
    productorId: string,
    query: FindHistorialVisitasProductorQueryDto,
    currentUser?: CurrentUserContext
  ) {
    const productor = await this.findProductorEntityById(productorId);

    validateDateRange(query.fecha_desde, query.fecha_hasta);

    const queryBuilder = this.createHistoryQueryBuilder().andWhere(
      "parcela.productor_id = :productorId",
      {
        productorId
      }
    );

    this.applyHistoryFilters(queryBuilder, query);
    if (isAgronomoUser(currentUser)) {
      queryBuilder.andWhere("visita.agronomo_usuario_id = :currentUserId", {
        currentUserId: currentUser!.userId
      });
    }
    queryBuilder.skip(query.skip).take(query.take);

    const [visitasCampo, total] = await queryBuilder.getManyAndCount();

    return createSuccessResponse(
      {
        productor: this.toProductorSummaryResponse(productor),
        filters: {
          campaignId: query.campania_id ?? null,
          agronomistUserId: isAgronomoUser(currentUser)
            ? currentUser!.userId
            : (query.agronomo_usuario_id ?? null),
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
    const parcela = await this.parcelasRepository.findOne({
      where: { id: parcelaId },
      relations: { subsector: true }
    });

    if (!parcela) {
      throw new NotFoundException("Parcela not found.");
    }

    const [visitasCampo, total] = await this.visitasCampoRepository.findAndCount({
      where: {
        parcelaId,
        isActive: true
      },
      relations: { phenologicalStages: { stage: true, subStage: true } },
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

  async update(
    id: string,
    updateVisitaCampoDto: UpdateVisitaCampoDto,
    currentUser?: CurrentUserContext
  ) {
    if (updateVisitaCampoDto.phenologicalStageId === null) {
      throw new BadRequestException("La etapa fenologica no puede eliminarse.");
    }

    const visitaCampo = await this.findEntityById(id);

    if (
      isAgronomoUser(currentUser) &&
      visitaCampo.agronomoUsuarioId !== currentUser!.userId
    ) {
      throw new NotFoundException("Visita de campo not found.");
    }

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
    const requestedStageId = updateVisitaCampoDto.phenologicalStageId ?? visitaCampo.etapaFenologicaId;
    const requestedSubEtapaId = updateVisitaCampoDto.subEtapaId !== undefined
      ? updateVisitaCampoDto.subEtapaId : visitaCampo.subEtapaId;
    if (!updateVisitaCampoDto.phenologicalStages &&
        (visitaCampo.phenologicalStages?.length ?? 0) > 1 &&
        (requestedStageId !== visitaCampo.etapaFenologicaId ||
         requestedSubEtapaId !== visitaCampo.subEtapaId)) {
      throw new ConflictException("Actualiza las etapas con una versión reciente de la app.");
    }
    const stageEntries = updateVisitaCampoDto.phenologicalStages
      ? await this.validateStageEntries(
          updateVisitaCampoDto.phenologicalStages,
          nextCropId,
          requestedStageId!,
          requestedSubEtapaId,
          null
        )
      : (visitaCampo.phenologicalStages?.length ?? 0) <= 1 &&
          (updateVisitaCampoDto.phenologicalStageId !== undefined ||
           updateVisitaCampoDto.subEtapaId !== undefined ||
           updateVisitaCampoDto.subEtapaPercentage !== undefined)
        ? await this.validateStageEntries(undefined, nextCropId, requestedStageId!, requestedSubEtapaId,
            updateVisitaCampoDto.subEtapaPercentage ?? null)
        : null;
    const primaryStage = stageEntries ? selectPrimaryStage(stageEntries) : null;
    const nextPhenologicalStageId = primaryStage?.phenologicalStageId ?? requestedStageId;
    const nextSubEtapaId = primaryStage ? primaryStage.subEtapaId : requestedSubEtapaId;
    const nextSubEtapaPercentage =
      updateVisitaCampoDto.phenologicalStages
        ? primaryStage?.laborProgressPercentage ??
          (nextPhenologicalStageId === visitaCampo.etapaFenologicaId &&
           nextSubEtapaId === visitaCampo.subEtapaId &&
           visitaCampo.subEtapaPercentage !== null
            ? Number(visitaCampo.subEtapaPercentage) : null)
        : updateVisitaCampoDto.subEtapaPercentage !== undefined
        ? updateVisitaCampoDto.subEtapaPercentage
        : visitaCampo.subEtapaPercentage === null
          ? null
          : Number(visitaCampo.subEtapaPercentage);

    await this.validateReferences(
      {
        cropId: nextCropId,
        varietyId: nextVarietyId,
        parcelaId: updateVisitaCampoDto.parcelaId ?? visitaCampo.parcelaId,
        campaignId: nextCampaignId,
        agronomistUserId:
          updateVisitaCampoDto.agronomistUserId ?? visitaCampo.agronomoUsuarioId,
        phenologicalStageId: nextPhenologicalStageId ?? undefined,
        subEtapaId: nextSubEtapaId ?? undefined,
        subEtapaPercentage: nextSubEtapaPercentage
      },
      currentUser
    );

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
      ...(stageEntries || updateVisitaCampoDto.phenologicalStageId !== undefined
        ? { etapaFenologicaId: nextPhenologicalStageId }
        : {}),
      ...(stageEntries || updateVisitaCampoDto.subEtapaId !== undefined
        ? { subEtapaId: nextSubEtapaId }
        : {}),
      ...(updateVisitaCampoDto.phenologicalStages
        ? { subEtapaPercentage: nextSubEtapaPercentage === null ? null : String(nextSubEtapaPercentage) }
        : updateVisitaCampoDto.subEtapaPercentage !== undefined
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
      const savedVisitaCampo = stageEntries
        ? await this.visitasCampoRepository.manager.transaction(async (manager) => {
            const saved = await manager.save(updatedVisitaCampo);
            await manager.getRepository(VisitaEtapaFenologicaEntity).delete({ visitaId: saved.id });
            saved.phenologicalStages = await manager.getRepository(VisitaEtapaFenologicaEntity).save(
              stageEntries.map((entry, order) => ({
                visitaId: saved.id,
                etapaFenologicaId: entry.phenologicalStageId,
                subEtapaId: entry.subEtapaId,
                coveragePercentage: entry.coveragePercentage,
                laborProgressPercentage: entry.laborProgressPercentage === null ? null : String(entry.laborProgressPercentage),
                order
              }))
            );
            return saved;
          })
        : await this.visitasCampoRepository.save(updatedVisitaCampo);

      return createSuccessResponse(this.toResponse(savedVisitaCampo));
    } catch (error) {
      this.handlePersistenceError(error);
    }
  }

  async remove(id: string, currentUser?: CurrentUserContext) {
    const visitaCampo = await this.findEntityById(id);

    if (!currentUser) {
      throw new ForbiddenException("No tiene permiso para eliminar visitas.");
    }

    if (!isAdminUser(currentUser)) {
      if (
        !isAgronomoUser(currentUser) ||
        visitaCampo.agronomoUsuarioId !== currentUser.userId
      ) {
        throw new NotFoundException("Visita de campo not found.");
      }

      const agronomo = await this.usuariosRepository.findOne({
        where: { id: currentUser.userId }
      });

      if (!agronomo?.canDeleteVisits) {
        throw new ForbiddenException("No tiene permiso para eliminar visitas.");
      }
    }

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
      where: { id },
      relations: { phenologicalStages: { stage: true, subStage: true } }
    });

    if (!visitaCampo) {
      throw new NotFoundException("Visita de campo not found.");
    }

    return visitaCampo;
  }

  private async findActiveEntityById(id: string) {
    const visitaCampo = await this.visitasCampoRepository.findOne({
      where: { id, isActive: true },
      relations: { phenologicalStages: { stage: true, subStage: true } }
    });

    if (!visitaCampo) {
      throw new NotFoundException("Visita de campo not found.");
    }

    return visitaCampo;
  }

  private async validateStageEntries(
    entries: VisitaEtapaFenologicaDto[] | undefined,
    cropId: string,
    legacyStageId: string,
    legacySubEtapaId: string | null,
    legacyProgress: number | null
  ): Promise<StageEntry[]> {
    const items: StageEntry[] = entries
      ? entries.map((item) => ({
          phenologicalStageId: item.phenologicalStageId,
          subEtapaId: item.subEtapaId ?? null,
          coveragePercentage: item.coveragePercentage ?? null,
          laborProgressPercentage: item.laborProgressPercentage ?? null
        }))
      : [{
          phenologicalStageId: legacyStageId,
          subEtapaId: legacySubEtapaId,
          coveragePercentage: null,
          laborProgressPercentage: legacyProgress
        }];
    if (items.length < 1 || items.length > 30) {
      throw new BadRequestException("Registra entre 1 y 30 etapas o labores.");
    }
    if (new Set(items.map((item) => item.phenologicalStageId)).size !== items.length) {
      throw new BadRequestException("No repitas una etapa en la visita.");
    }
    let totalCoverage = 0;
    for (const item of items) {
      const stage = await this.findRequiredEntity(
        this.etapasFenologicasRepository, item.phenologicalStageId,
        "Etapa fenologica not found."
      );
      if (stage.cultivoId !== cropId) {
        throw new BadRequestException("La etapa no corresponde al cultivo.");
      }
      if (stage.type === "Etapa") {
        if (entries && (!item.subEtapaId || !Number.isInteger(item.coveragePercentage) ||
            item.coveragePercentage! < 1 || item.coveragePercentage! > 100 ||
            item.laborProgressPercentage !== null)) {
          throw new BadRequestException("Cada etapa requiere subetapa y porcentaje de parcela válido.");
        }
        if (item.subEtapaId) {
          const subStage = await this.findRequiredEntity(this.subEtapasRepository,
            item.subEtapaId, "Sub etapa not found.");
          if (subStage.etapaFenologicaId !== item.phenologicalStageId) {
            throw new BadRequestException("La subetapa no corresponde a la etapa.");
          }
        }
        item.coveragePercentage = entries ? item.coveragePercentage : 100;
        item.laborProgressPercentage = null;
        totalCoverage += item.coveragePercentage ?? 0;
      } else {
        if (item.subEtapaId || item.coveragePercentage !== null ||
            (item.laborProgressPercentage !== null &&
             (!Number.isFinite(item.laborProgressPercentage) ||
              item.laborProgressPercentage < 0 || item.laborProgressPercentage > 100))) {
          throw new BadRequestException("Una labor no lleva subetapa ni cobertura de parcela.");
        }
      }
    }
    if (entries && totalCoverage > 0 && totalCoverage !== 100) {
      throw new BadRequestException("Los porcentajes de parcela deben sumar 100.");
    }
    if (entries) {
      const primary = selectPrimaryStage(items);
      if (legacyStageId !== primary.phenologicalStageId ||
          legacySubEtapaId !== primary.subEtapaId) {
        throw new BadRequestException("La etapa principal no coincide con la distribución.");
      }
    }
    return items;
  }

  private async validateReferences(
    input: {
      cropId: string;
      varietyId: string;
      parcelaId: string;
      campaignId: string;
      agronomistUserId: string;
      phenologicalStageId?: string | null;
      subEtapaId?: string | null;
      subEtapaPercentage?: number | null;
    },
    currentUser?: CurrentUserContext
  ) {
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
    const parcela = await this.findRequiredEntity(
      this.parcelasRepository,
      input.parcelaId,
      "Parcela not found."
    );

    if (!parcela.isActive) {
      throw new BadRequestException(
        "La parcela debe estar activa para registrar una visita."
      );
    }

    if (
      isAgronomoUser(currentUser) &&
      (parcela.agronomoUsuarioId !== currentUser!.userId ||
        input.agronomistUserId !== currentUser!.userId)
    ) {
      throw new NotFoundException("Parcela not found.");
    }
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
      if (etapaFenologica.type === "Etapa" &&
          input.subEtapaPercentage !== undefined && input.subEtapaPercentage !== null) {
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
    const queryBuilder = this.visitasCampoRepository.createQueryBuilder("visita")
      .leftJoinAndSelect("visita.phenologicalStages", "phenologicalStages")
      .leftJoinAndSelect("phenologicalStages.stage", "stageEntryCatalog")
      .leftJoinAndSelect("phenologicalStages.subStage", "subStageEntryCatalog");

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
      .leftJoinAndSelect("visita.phenologicalStages", "phenologicalStages")
      .leftJoinAndSelect("phenologicalStages.stage", "stageEntryCatalog")
      .leftJoinAndSelect("phenologicalStages.subStage", "subStageEntryCatalog")
      .innerJoin(ParcelaEntity, "parcela", "parcela.id = visita.parcela_id")
      .where("visita.activo = true")
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
      technicalScoreVersion: visitaCampo.technicalScoreVersion,
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
      phenologicalStages: (visitaCampo.phenologicalStages ?? [])
        .sort((a, b) => a.order - b.order)
        .map((entry) => ({
          phenologicalStageId: entry.etapaFenologicaId,
          stageName: entry.stage?.name ?? null,
          subEtapaId: entry.subEtapaId,
          subEtapaName: entry.subStage?.name ?? null,
          coveragePercentage: entry.coveragePercentage,
          laborProgressPercentage: entry.laborProgressPercentage === null
            ? null : Number(entry.laborProgressPercentage)
        })),
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
      tipoRiegoId: riego.tipoRiegoId,
      fuenteAgua: riego.fuenteAgua,
      tipoSuelo: riego.tipoSuelo,
      humedadSuelo: riego.humedadSuelo,
      estresHidrico: riego.estresHidrico
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

  private toCalificacionResponse(calificacion: VisitaCalificacionEntity) {
    return {
      id: calificacion.id,
      publicId: calificacion.publicId,
      visitaId: calificacion.visitaId,
      modulo: calificacion.modulo,
      puntaje: calificacion.puntaje,
      observacion: calificacion.observacion,
      createdAt: calificacion.createdAt,
      updatedAt: calificacion.updatedAt
    };
  }

  private toProductorSummaryResponse(productor: ProductorEntity) {
    return {
      id: productor.id,
      publicId: productor.publicId,
      entityType: productor.entityType,
      documentTypeId: productor.documentTypeId,
      documentNumber: productor.documentNumber,
      firstName: productor.firstName,
      lastName: productor.lastName,
      email: productor.email,
      isActive: productor.isActive
    };
  }

  private toParcelaSummaryResponse(parcela: ParcelaEntity) {
    if (!parcela.subsector?.sectorId) {
      throw new BadRequestException(
        "No se pudo derivar el sector de la parcela desde su subsector."
      );
    }

    return {
      id: parcela.id,
      publicId: parcela.publicId,
      productorId: parcela.productorId,
      subsectorId: parcela.subsectorId,
      sectorId: parcela.subsector.sectorId,
      code: parcela.code,
      name: parcela.name,
      isActive: parcela.isActive
    };
  }
}

function buildUserLabel(user: UserEntity | null | undefined) {
  return (
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "No registrado"
  );
}

function selectPrimaryStage(entries: StageEntry[]): StageEntry {
  return entries.reduce((primary, entry) =>
    (entry.coveragePercentage ?? -1) > (primary.coveragePercentage ?? -1)
      ? entry : primary
  );
}

function buildProductorLabel(productor: ProductorEntity | null | undefined) {
  return (
    [productor?.firstName, productor?.lastName].filter(Boolean).join(" ").trim() ||
    productor?.documentNumber ||
    "No registrado"
  );
}

function buildParcelaLabel(parcela: ParcelaEntity | null | undefined) {
  if (!parcela) {
    return "No registrada";
  }

  return parcela.name ? `${parcela.code} - ${parcela.name}` : parcela.code;
}

function buildEtapaLabel(etapa: EtapaFenologicaEntity | null | undefined) {
  return etapa?.name ?? "No registrada";
}

function buildStageExcelLabel(visita: VisitaCampoEntity) {
  if (!visita.phenologicalStages?.length) return buildEtapaLabel(visita.etapaFenologica);
  return [...visita.phenologicalStages].sort((a, b) => a.order - b.order).map((entry) => [
    entry.stage?.name ?? entry.etapaFenologicaId,
    entry.subStage?.name,
    entry.coveragePercentage === null ? null : `${entry.coveragePercentage}% parcela`,
    entry.laborProgressPercentage === null ? null : `${entry.laborProgressPercentage}% avance labor`
  ].filter(Boolean).join(" - ")).join("; ");
}

function buildExcelDiagnosisRows(visita: VisitaCampoEntity): ExcelDiagnosisRow[] {
  const pests = uniqueExcelDiagnosisNames(
    (visita.observacionesSanitarias ?? [])
      .filter((observation) => observation.plagaEnfermedad?.type === "plaga")
      .map((observation) => observation.plagaEnfermedad?.name ?? "No registrada")
  );
  const diseases = uniqueExcelDiagnosisNames(
    (visita.observacionesSanitarias ?? [])
      .filter((observation) => observation.plagaEnfermedad?.type === "enfermedad")
      .map((observation) => observation.plagaEnfermedad?.name ?? "No registrada")
  );
  const nutrition = uniqueExcelDiagnosisNames(
    (visita.evaluaciones ?? [])
      .filter(
        (evaluation) =>
          Boolean(evaluation.nutrientId) ||
          evaluation.description?.startsWith("Nutricion - ")
      )
      .sort(
        (left, right) => left.order - right.order || compareEntityIds(left.id, right.id)
      )
      .map((evaluation) => {
        const descriptionParts = evaluation.description.split(" - ");

        return evaluation.nutrient?.name ?? descriptionParts[1] ?? evaluation.description;
      })
  );
  const rowCount = Math.max(pests.length, diseases.length, nutrition.length, 1);

  return Array.from({ length: rowCount }, (_, index) => ({
    pest: pests[index] ?? (index === 0 && pests.length === 0 ? "Sin plagas" : ""),
    disease:
      diseases[index] ?? (index === 0 && diseases.length === 0 ? "Sin enfermedades" : ""),
    nutrition:
      nutrition[index] ??
      (index === 0 && nutrition.length === 0 ? "Sin deficiencias nutricionales" : "")
  }));
}

function uniqueExcelDiagnosisNames(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function compareEntityIds(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true });
}

function mergeAndCenterSingleDiagnosis(
  worksheet: ExcelJS.Worksheet,
  firstRow: number,
  lastRow: number,
  column: number
) {
  const diagnosisRows = Array.from(
    { length: lastRow - firstRow + 1 },
    (_, index) => firstRow + index
  ).filter((row) => {
    const value = worksheet.getCell(row, column).value;

    return typeof value === "string" && value.trim() !== "";
  });

  if (diagnosisRows.length === 1 && lastRow > firstRow) {
    worksheet.mergeCells(firstRow, column, lastRow, column);
  }

  for (const row of diagnosisRows) {
    worksheet.getCell(row, column).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true
    };
  }
}

function toWorksheetText(value: string) {
  return /^[=+\-@]/u.test(value) ? `'${value}` : value;
}

function buildFriendlyVisitNumber(id: string) {
  return `VSM${id.padStart(4, "0")}`;
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

function isAgronomoUser(currentUser?: CurrentUserContext): boolean {
  if (!currentUser) {
    return false;
  }

  return currentUser.roles.includes("AGRONOMO") && !currentUser.roles.includes("ADMIN");
}

function isAdminUser(currentUser?: CurrentUserContext): boolean {
  return currentUser?.roles.includes("ADMIN") === true;
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
