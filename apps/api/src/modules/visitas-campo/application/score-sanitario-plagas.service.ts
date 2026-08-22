import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { VisitaRecetaEntity } from "../../visita-recetas/infrastructure/persistence/entities/visita-receta.entity";
import { VisitaObservacionSanitariaEntity } from "../../visita-observaciones-sanitarias/infrastructure/persistence/entities/visita-observacion-sanitaria.entity";
import { VisitaCampoEntity } from "../infrastructure/persistence/entities/visita-campo.entity";
import { VisitaPasoObservacionEntity } from "../infrastructure/persistence/entities/visita-paso-observacion.entity";

export type PestSemaphore = "verde" | "amarillo" | "rojo";

export type PestScoreDetailItem = {
  key: string;
  pestDiseaseId: string | null;
  name: string;
  evaluated: boolean;
  incidenceGrade: number;
  severityGrade: number;
  score: number;
  formula: string;
  specialRule: string | null;
};

export type PestModuleScoreDetail = {
  moduleFormula: string;
  appliedFormula: string;
  moduleScore: number;
  modulePercentage: number;
  semaphore: PestSemaphore;
  status: string;
  message: string;
  pestScores: PestScoreDetailItem[];
};

type ModuleScore = {
  finalized: boolean;
  score: number | null;
  percentage: number | null;
  detail: PestModuleScoreDetail | null;
};

type PestDefinition = {
  key: string;
  name: string;
  aliases: string[];
  codes: string[];
};

const PEST_DEFINITIONS_V1: PestDefinition[] = [
  { key: "trips", name: "Trips", aliases: ["trips"], codes: ["trips"] },
  {
    key: "queresas",
    name: "Queresas",
    aliases: ["queresa", "queresas"],
    codes: ["queresa", "queresas"]
  },
  {
    key: "acaros",
    name: "Ácaros",
    aliases: ["acaro", "acaros"],
    codes: ["acaro", "acaros"]
  },
  {
    key: "cochinilla",
    name: "Cochinilla",
    aliases: ["cochinilla", "cochinillas"],
    codes: ["cochinilla", "cochinillas"]
  },
  {
    key: "chinche",
    name: "Chinche",
    aliases: ["chinche", "chinches"],
    codes: ["chinche", "chinches"]
  },
  {
    key: "mosca_fruta",
    name: "Mosca de la fruta",
    aliases: ["mosca de la fruta", "mosca fruta"],
    codes: ["mosca_fruta"]
  }
];

const PEST_DEFINITIONS_V2: PestDefinition[] = [
  ...PEST_DEFINITIONS_V1,
  {
    key: "aranita_roja",
    name: "Arañita roja",
    aliases: ["aranita roja", "arañita roja"],
    codes: ["aranita_roja"]
  },
  {
    key: "mosca_blanca",
    name: "Mosca blanca",
    aliases: ["mosca blanca"],
    codes: ["mosca_blanca"]
  },
  {
    key: "gusano_barrenador",
    name: "Gusano barrenador",
    aliases: ["gusano barrenador"],
    codes: ["gusano_barrenador"]
  },
  {
    key: "hormiga_arriera",
    name: "Hormiga arriera",
    aliases: ["hormiga arriera"],
    codes: ["hormiga_arriera"]
  }
];

const PEST_MODULE_FORMULA =
  "MIN(nota de Trips, nota de Queresas, nota de Ácaros, nota de Cochinilla, nota de Chinche, nota de Mosca de la fruta)";

@Injectable()
export class ScoreSanitarioPlagasService {
  constructor(
    @InjectRepository(VisitaCampoEntity)
    private readonly visits: Repository<VisitaCampoEntity>,
    @InjectRepository(VisitaPasoObservacionEntity)
    private readonly steps: Repository<VisitaPasoObservacionEntity>,
    @InjectRepository(VisitaObservacionSanitariaEntity)
    private readonly observations: Repository<VisitaObservacionSanitariaEntity>,
    @InjectRepository(VisitaRecetaEntity)
    private readonly recipes: Repository<VisitaRecetaEntity>
  ) {}

  async byVisit(visitaId: string) {
    const result = await this.resolveVisitScore(visitaId);
    return createSuccessResponse({
      visitaId,
      pasoPlagasFinalizado: result.finalized,
      scoreModuloPlagas: result.score,
      porcentajePlagas: result.percentage,
      detallePlagas: result.detail
    });
  }

  async byProductor(productorId: string, campaniaId?: string) {
    const query = this.visits
      .createQueryBuilder("visita")
      .innerJoin("parcelas", "parcela", "parcela.id = visita.parcela_id")
      .where("parcela.productor_id = :productorId", { productorId })
      .andWhere("visita.activo = true");
    if (campaniaId) query.andWhere("visita.campania_id = :campaniaId", { campaniaId });
    const visits = await query.getMany();
    const scores = (
      await Promise.all(visits.map((visit) => this.resolveVisitScore(visit.id)))
    )
      .map((item) => item.percentage)
      .filter((item): item is number => item !== null);
    const average = scores.length
      ? roundHalfUp(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : null;
    return createSuccessResponse({
      productorId,
      campaniaId: campaniaId ?? null,
      scoreSanitarioProductor: campaniaId ? null : average,
      scoreSanitarioCampania: campaniaId ? average : null,
      visitasElegibles: scores.length
    });
  }

  async resolveVisitScore(
    visitaId: string,
    completedByRecipe?: boolean
  ): Promise<ModuleScore> {
    const visit = await this.visits.findOne({ where: { id: visitaId } });
    if (!visit) throw new NotFoundException("Visita de campo no encontrada.");
    if (!visit.isActive)
      return { finalized: false, score: null, percentage: null, detail: null };
    const step = await this.steps.findOne({ where: { visitaId, stepNumber: 2 } });
    const hasRecipe =
      completedByRecipe ??
      Boolean(
        await this.recipes.findOne({
          where: { visitaId },
          select: { id: true }
        })
      );
    if (!step?.finalizedAt && !hasRecipe)
      return { finalized: false, score: null, percentage: null, detail: null };
    const department = await this.visits
      .createQueryBuilder("v")
      .innerJoin("parcelas", "p", "p.id = v.parcela_id")
      .innerJoin("subsectores", "ss", "ss.id = p.subsector_id")
      .innerJoin("sectores", "s", "s.id = ss.sector_id")
      .innerJoin("distritos", "d", "d.id = s.distrito_id")
      .innerJoin("provincias", "pr", "pr.id = d.provincia_id")
      .innerJoin("departamentos", "de", "de.id = pr.departamento_id")
      .select("de.codigo", "code")
      .where("v.id = :visitaId", { visitaId })
      .getRawOne<{ code: string }>();
    const rows = await this.observations.find({
      where: { visitaId },
      relations: { plagaEnfermedad: true, nivelIncidencia: true, nivelSeveridad: true }
    });
    const pestDefinitions =
      visit.technicalScoreVersion === 2 ? PEST_DEFINITIONS_V2 : PEST_DEFINITIONS_V1;
    const pestRows = rows.filter((row) => row.plagaEnfermedad.type === "plaga");
    const pestScores = pestDefinitions.map((definition) => {
      const row = pestRows.find((candidate) =>
        matchesPestDefinition(candidate, definition)
      );
      const incidence = row?.nivelIncidencia?.grade ?? 0;
      const severity = row?.nivelSeveridad?.grade ?? 0;
      const specialRule = resolveFlySpecialRule(
        definition.key,
        incidence,
        severity,
        department?.code
      );
      const score = specialRule ? 0 : 3 - Math.max(incidence, severity);

      return {
        key: definition.key,
        pestDiseaseId: row?.plagaEnfermedadId ?? null,
        name: definition.name,
        evaluated: Boolean(row),
        incidenceGrade: incidence,
        severityGrade: severity,
        score,
        formula: specialRule
          ? `${specialRule} ⇒ nota 0`
          : `3 - MAX(${incidence}, ${severity}) = ${score}`,
        specialRule
      } satisfies PestScoreDetailItem;
    });
    const score = Math.min(...pestScores.map((item) => item.score));
    const percentage = roundHalfUp((score / 3) * 100);
    const semaphore = resolvePestSemaphore(score);
    const detail: PestModuleScoreDetail = {
      moduleFormula:
        visit.technicalScoreVersion === 2
          ? `MIN(${pestDefinitions.map((item) => `nota de ${item.name}`).join(", ")})`
          : PEST_MODULE_FORMULA,
      appliedFormula: `MIN(${pestScores.map((item) => item.score).join(", ")}) = ${score}`,
      moduleScore: score,
      modulePercentage: percentage,
      semaphore: semaphore.semaphore,
      status: semaphore.status,
      message: semaphore.message,
      pestScores
    };

    return { finalized: true, score, percentage, detail };
  }
}

function matchesPestDefinition(
  row: VisitaObservacionSanitariaEntity,
  definition: PestDefinition
) {
  const normalizedCode = normalizePestValue(row.plagaEnfermedad.code ?? "").replaceAll(
    " ",
    "_"
  );
  if (definition.key === "mosca_fruta") {
    return definition.codes.includes(normalizedCode);
  }
  const normalizedName = normalizePestValue(row.plagaEnfermedad.name);
  return (
    definition.codes.includes(normalizedCode) ||
    definition.aliases.includes(normalizedName)
  );
}

function normalizePestValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveFlySpecialRule(
  pestKey: string,
  incidence: number,
  severity: number,
  departmentCode?: string
) {
  if (pestKey !== "mosca_fruta") return null;
  if (severity >= 1) return "Regla Mosca de la fruta: severidad ≥ 1";
  if (departmentCode === "14" && incidence === 3) {
    return "Regla Mosca de la fruta: Lambayeque e incidencia 3";
  }
  if (departmentCode === "20" && incidence >= 2) {
    return "Regla Mosca de la fruta: Piura e incidencia ≥ 2";
  }
  return null;
}

export function resolvePestSemaphore(score: number) {
  if (score === 0) {
    return {
      semaphore: "rojo" as const,
      status: "Emergencia en Campo",
      message: "¡Emergencia Fitosanitaria! Alta población o daño crítico."
    };
  }
  if (score === 1) {
    return {
      semaphore: "amarillo" as const,
      status: "Alerta / Umbral de Intervención",
      message:
        "Umbral de acción alcanzado en uno o más insectos. Programar lavado de árboles y aplicación dirigida de aceites agrícolas, jabones potásicos o insecticidas específicos de bajo impacto."
    };
  }
  return {
    semaphore: "verde" as const,
    status: "Salud Fitosanitaria Alta/Buena",
    message:
      "Poblaciones bajo control. Continuar con el monitoreo semanal planificado y la liberación de controladores biológicos (crisopas/avispitas)."
  };
}

function roundHalfUp(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
