import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { ParcelaEntity } from "../../parcelas/infrastructure/persistence/entities/parcela.entity";
import { ProductorEntity } from "../../productores/infrastructure/persistence/entities/productor.entity";
import { VisitaCampoEntity } from "../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { VisitaRecetaEntity } from "../../visita-recetas/infrastructure/persistence/entities/visita-receta.entity";
import {
  CALIFICACION_MODULOS,
  type CalificacionModulo,
  resolveStageWeights
} from "../domain/weight-matrix";
import { VisitaCalificacionEntity } from "../infrastructure/persistence/entities/visita-calificacion.entity";
import { UpsertVisitaCalificacionDto } from "../presentation/dto/upsert-visita-calificacion.dto";

type ModuleScoreMap = Record<CalificacionModulo, number | null>;

type VisitScore = {
  visitaId: string;
  campaignId: string;
  scoreGeneral: number | null;
  scorePorModulo: ModuleScoreMap;
};

type NormalizedJustification = {
  justificado: boolean | null;
  categoriaJustificacion: string | null;
  motivoJustificacion: string | null;
};

@Injectable()
export class VisitaCalificacionesService {
  constructor(
    @InjectRepository(VisitaCalificacionEntity)
    private readonly calificacionesRepository: Repository<VisitaCalificacionEntity>,
    @InjectRepository(VisitaCampoEntity)
    private readonly visitasRepository: Repository<VisitaCampoEntity>,
    @InjectRepository(VisitaRecetaEntity)
    private readonly recetasRepository: Repository<VisitaRecetaEntity>,
    @InjectRepository(ParcelaEntity)
    private readonly parcelasRepository: Repository<ParcelaEntity>,
    @InjectRepository(ProductorEntity)
    private readonly productoresRepository: Repository<ProductorEntity>
  ) {}

  async upsert(visitaId: string, dto: UpsertVisitaCalificacionDto) {
    await this.ensureVisitaExists(visitaId);
    const justification = normalizeJustification(dto);

    const existing = await this.calificacionesRepository.findOne({
      where: { visitaId, modulo: dto.modulo }
    });

    const entity = existing
      ? this.calificacionesRepository.merge(existing, {
          puntaje: dto.puntaje,
          observacion: dto.observacion ?? null,
          ...justification,
          updatedAt: new Date()
        })
      : this.calificacionesRepository.create({
          visitaId,
          modulo: dto.modulo,
          puntaje: dto.puntaje,
          observacion: dto.observacion ?? null,
          ...justification
        });

    const saved = await this.calificacionesRepository.save(entity);

    return createSuccessResponse(this.toResponse(saved));
  }

  async findByVisitaId(visitaId: string) {
    await this.ensureVisitaExists(visitaId, true);

    const calificaciones = await this.findEntitiesByVisitaId(visitaId);

    return createSuccessResponse(calificaciones.map((item) => this.toResponse(item)));
  }

  async findEntitiesByVisitaId(visitaId: string) {
    return this.calificacionesRepository.find({
      where: { visitaId },
      order: { modulo: "ASC", id: "ASC" }
    });
  }

  async findPreviousRecipe(
    parcelaId: string,
    options: { excluirVisitaId?: string | null } = {}
  ) {
    await this.ensureParcelaExists(parcelaId);

    const queryBuilder = this.visitasRepository
      .createQueryBuilder("visita")
      .innerJoin(VisitaRecetaEntity, "receta", "receta.visita_id = visita.id")
      .leftJoinAndSelect("visita.etapaFenologica", "etapaFenologica")
      .where("visita.parcela_id = :parcelaId", { parcelaId })
      .andWhere("visita.activo = true")
      .orderBy("visita.fecha_visita", "DESC")
      .addOrderBy("visita.hora_visita_inicio", "DESC")
      .addOrderBy("visita.id", "DESC");

    if (options.excluirVisitaId) {
      queryBuilder.andWhere("visita.id <> :excluirVisitaId", {
        excluirVisitaId: options.excluirVisitaId
      });
    }

    const previousVisit = await queryBuilder.getOne();

    if (!previousVisit) {
      return createSuccessResponse({ existe: false });
    }

    const receta = await this.recetasRepository.findOne({
      where: { visitaId: previousVisit.id },
      relations: ["fitosanidad", "fertilizacion", "riego", "labores"]
    });

    if (!receta) {
      return createSuccessResponse({ existe: false });
    }

    return createSuccessResponse({
      existe: true,
      visitaId: previousVisit.id,
      fechaVisita: previousVisit.fechaVisita,
      etapaFenologicaNombre: previousVisit.etapaFenologica?.name ?? null,
      fitosanidad: (receta.fitosanidad ?? []).map((item) => ({
        numero: item.numero,
        objetivo: item.objetivo,
        objetivoNombre: item.objetivoNombre,
        tipoControlId: item.tipoControlId,
        tipoProductoId: item.tipoProductoId,
        disolvente: item.disolvente,
        modoAccionId: item.modoAccionId,
        ingredienteActivoNombre: item.ingredienteActivoNombre,
        dosisIa: item.dosisIa,
        volumenAplicacion: item.volumenAplicacion,
        cantidadTotalIa: item.cantidadTotalIa,
        marcaProductoNombre: item.marcaProductoNombre,
        concentracionProducto: item.concentracionProducto,
        cantidadTotalProducto: item.cantidadTotalProducto,
        coadyuvantesIds: item.coadyuvantesIds,
        ordenMezcla: item.ordenMezcla
      })),
      fertilizacion: (receta.fertilizacion ?? []).map((item) => ({
        viaAplicacion: item.viaAplicacion,
        fertilizanteNombre: item.fertilizanteNombre,
        tipoProducto: item.tipoProducto,
        dosis: item.dosis,
        unidadDosis: item.unidadDosis,
        cantidadTotalPlantas: item.cantidadTotalPlantas,
        volumenAplicacion: item.volumenAplicacion,
        cantidadTotalFertilizante: item.cantidadTotalFertilizante
      })),
      riego: receta.riego
        ? {
            tipoRecomendacion: receta.riego.tipoRecomendacion
          }
        : null,
      labores: (receta.labores ?? []).map((item) => ({
        labor: item.labor
      }))
    });
  }

  async getProductorScore(
    productorId: string,
    options: { campaniaId?: string | null } = {}
  ) {
    await this.ensureProductorExists(productorId);

    const queryBuilder = this.visitasRepository
      .createQueryBuilder("visita")
      .innerJoin(ParcelaEntity, "parcela", "parcela.id = visita.parcela_id")
      .leftJoinAndSelect("visita.etapaFenologica", "etapaFenologica")
      .where("parcela.productor_id = :productorId", { productorId })
      .andWhere("visita.activo = true")
      .orderBy("visita.fecha_visita", "DESC");

    if (options.campaniaId) {
      queryBuilder.andWhere("visita.campania_id = :campaniaId", {
        campaniaId: options.campaniaId
      });
    }

    const visitas = await queryBuilder.getMany();
    const calificacionesByVisit = await this.findCalificacionesByVisitIds(
      visitas.map((visita) => visita.id)
    );
    const visitScores = visitas.map((visita) =>
      this.calculateVisitScore(
        visita,
        calificacionesByVisit.get(visita.id) ?? []
      )
    );
    const scoredVisits = visitScores.filter((score) => score.scoreGeneral !== null);

    return createSuccessResponse({
      productorId,
      scoreGeneral: average(
        scoredVisits.map((score) => score.scoreGeneral).filter(isNumber)
      ),
      scorePorCampania: groupScoresByCampaign(visitScores),
      totalVisitas: visitas.length,
      totalVisitasCalificadas: scoredVisits.length
    });
  }

  calculateVisitScore(
    visita: Pick<VisitaCampoEntity, "id" | "campaniaId"> & {
      etapaFenologica?: { name: string } | null;
    },
    calificaciones: VisitaCalificacionEntity[]
  ): VisitScore {
    const calificacionesByModule = new Map(
      calificaciones.map((calificacion) => [calificacion.modulo, calificacion])
    );
    const moduleScores = emptyModuleScores();

    for (const modulo of CALIFICACION_MODULOS) {
      const calificacion = calificacionesByModule.get(modulo);
      moduleScores[modulo] = calificacion ? roundScore((calificacion.puntaje / 3) * 100) : null;
    }

    const hasAllModules = CALIFICACION_MODULOS.every((modulo) =>
      calificacionesByModule.has(modulo)
    );
    const weights = resolveStageWeights(visita.etapaFenologica?.name ?? null);

    if (!hasAllModules || !weights) {
      return {
        visitaId: visita.id,
        campaignId: visita.campaniaId,
        scoreGeneral: null,
        scorePorModulo: moduleScores
      };
    }

    const scoreGeneral = CALIFICACION_MODULOS.reduce((total, modulo) => {
      const calificacion = calificacionesByModule.get(modulo);

      if (!calificacion) {
        return total;
      }

      return total + (calificacion.puntaje / 3) * weights[modulo];
    }, 0);

    return {
      visitaId: visita.id,
      campaignId: visita.campaniaId,
      scoreGeneral: roundScore(scoreGeneral),
      scorePorModulo: moduleScores
    };
  }

  private async findCalificacionesByVisitIds(visitaIds: string[]) {
    const result = new Map<string, VisitaCalificacionEntity[]>();

    if (visitaIds.length === 0) {
      return result;
    }

    const calificaciones = await this.calificacionesRepository.find({
      where: { visitaId: In(visitaIds) }
    });

    for (const calificacion of calificaciones) {
      const current = result.get(calificacion.visitaId) ?? [];

      current.push(calificacion);
      result.set(calificacion.visitaId, current);
    }

    return result;
  }

  private async ensureVisitaExists(visitaId: string, useNotFoundException = false) {
    const visita = await this.visitasRepository.findOne({
      where: { id: visitaId }
    });

    if (!visita) {
      if (useNotFoundException) {
        throw new NotFoundException("Visita de campo not found.");
      }

      throw new BadRequestException("Visita de campo not found.");
    }
  }

  private async ensureParcelaExists(parcelaId: string) {
    const parcela = await this.parcelasRepository.findOne({
      where: { id: parcelaId }
    });

    if (!parcela) {
      throw new NotFoundException("Parcela not found.");
    }
  }

  private async ensureProductorExists(productorId: string) {
    const productor = await this.productoresRepository.findOne({
      where: { id: productorId }
    });

    if (!productor) {
      throw new NotFoundException("Productor not found.");
    }
  }

  private toResponse(calificacion: VisitaCalificacionEntity) {
    return {
      id: calificacion.id,
      publicId: calificacion.publicId,
      visitaId: calificacion.visitaId,
      modulo: calificacion.modulo,
      puntaje: calificacion.puntaje,
      observacion: calificacion.observacion,
      justificado: calificacion.justificado,
      categoriaJustificacion: calificacion.categoriaJustificacion,
      motivoJustificacion: calificacion.motivoJustificacion,
      createdAt: calificacion.createdAt,
      updatedAt: calificacion.updatedAt
    };
  }
}

function normalizeJustification(
  dto: UpsertVisitaCalificacionDto
): NormalizedJustification {
  if (dto.puntaje === 3) {
    return {
      justificado: null,
      categoriaJustificacion: null,
      motivoJustificacion: null
    };
  }

  if (typeof dto.justificado !== "boolean") {
    throw new BadRequestException(
      "Indica si el incumplimiento esta justificado."
    );
  }

  if (!dto.justificado) {
    return {
      justificado: false,
      categoriaJustificacion: null,
      motivoJustificacion: null
    };
  }

  const categoriaJustificacion = dto.categoriaJustificacion?.trim() || null;
  const motivoJustificacion = dto.motivoJustificacion?.trim() || null;

  if (!categoriaJustificacion || !motivoJustificacion) {
    throw new BadRequestException(
      "Selecciona categoria y motivo para justificar el incumplimiento."
    );
  }

  return {
    justificado: true,
    categoriaJustificacion,
    motivoJustificacion
  };
}

function emptyModuleScores(): ModuleScoreMap {
  return {
    plagas: null,
    enfermedades: null,
    nutricion: null,
    riego: null,
    labores: null
  };
}

function averageModuleScores(scores: VisitScore[]) {
  const result = emptyModuleScores();

  for (const modulo of CALIFICACION_MODULOS) {
    result[modulo] = average(
      scores.map((score) => score.scorePorModulo[modulo]).filter(isNumber)
    );
  }

  return result;
}

function groupScoresByCampaign(scores: VisitScore[]) {
  const result: Record<
    string,
    { scoreGeneral: number | null; scorePorModulo: ModuleScoreMap }
  > = {};
  const grouped = new Map<string, VisitScore[]>();

  for (const score of scores) {
    const current = grouped.get(score.campaignId) ?? [];

    current.push(score);
    grouped.set(score.campaignId, current);
  }

  for (const [campaignId, campaignScores] of grouped) {
    result[campaignId] = {
      scoreGeneral: average(
        campaignScores.map((score) => score.scoreGeneral).filter(isNumber)
      ),
      scorePorModulo: averageModuleScores(campaignScores)
    };
  }

  return result;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return roundScore(values.reduce((total, value) => total + value, 0) / values.length);
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

function isNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
