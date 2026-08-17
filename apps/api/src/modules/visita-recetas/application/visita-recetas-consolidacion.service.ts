import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { createSuccessResponse } from "../../../common/http/api-response";
import { VisitaCampoEntity } from "../../visitas-campo/infrastructure/persistence/entities/visita-campo.entity";
import { VisitaObservacionSanitariaEntity } from "../../visita-observaciones-sanitarias/infrastructure/persistence/entities/visita-observacion-sanitaria.entity";
import { VisitaEvaluacionEntity } from "../../visita-evaluaciones/infrastructure/persistence/entities/visita-evaluacion.entity";
import { VisitaRiegoEntity } from "../../visita-riegos/infrastructure/persistence/entities/visita-riego.entity";
import { VisitaLaborCulturalEntity } from "../../visita-labores-culturales/infrastructure/persistence/entities/visita-labor-cultural.entity";
import { resolveDiseaseIncidenceGrade } from "../../visita-observaciones-sanitarias/domain/disease-incidence";

type ConsolidacionHallazgo = {
  etapaFenologica: string | null;
  plagas: Array<{
    objetivoId: string;
    nombre: string;
    incidencia: string;
    severidad: string;
    organos: string[];
    incidenceGrade: number;
  }>;
  enfermedades: Array<{
    objetivoId: string;
    nombre: string;
    incidencia: string;
    severidad: string;
    organos: string[];
    incidenceGrade: number;
  }>;
  nutricion: Array<{
    elemento: string;
    incidencia: string;
    severidad: string;
    incidenceGrade: number;
  }>;
  riego: {
    humedadSuelo: string | null;
    estresHidrico: boolean | null;
  };
  labores: Array<{
    nombre: string;
    categoria: string;
  }>;
};

@Injectable()
export class VisitaRecetasConsolidacionService {
  constructor(
    @InjectRepository(VisitaCampoEntity)
    private readonly visitaRepository: Repository<VisitaCampoEntity>,
    @InjectRepository(VisitaObservacionSanitariaEntity)
    private readonly observacionSanitariaRepository: Repository<VisitaObservacionSanitariaEntity>,
    @InjectRepository(VisitaEvaluacionEntity)
    private readonly evaluacionRepository: Repository<VisitaEvaluacionEntity>,
    @InjectRepository(VisitaRiegoEntity)
    private readonly riegoRepository: Repository<VisitaRiegoEntity>,
    @InjectRepository(VisitaLaborCulturalEntity)
    private readonly laborRepository: Repository<VisitaLaborCulturalEntity>
  ) {}

  async getConsolidacion(visitaId: string) {
    const visita = await this.visitaRepository.findOne({
      where: { id: visitaId },
      relations: ["etapaFenologica", "subEtapa"]
    });

    if (!visita) {
      throw new NotFoundException("Visita de campo not found.");
    }

    const etapaFenologica =
      visita.etapaFenologica && visita.subEtapa
        ? `${visita.etapaFenologica.name} - ${visita.subEtapa.name} (${visita.subEtapa.percentage ?? visita.subEtapaPercentage ?? ""})`
        : visita.etapaFenologica && visita.subEtapaPercentage !== null
          ? `${visita.etapaFenologica.name} (${visita.subEtapaPercentage})`
          : (visita.etapaFenologica?.name ?? null);

    const [observaciones, evaluaciones, riego, labores] = await Promise.all([
      this.observacionSanitariaRepository.find({
        where: { visitaId },
        relations: [
          "plagaEnfermedad",
          "nivelIncidencia",
          "nivelSeveridad",
          "organosAfectados"
        ]
      }),
      this.evaluacionRepository.find({
        where: { visitaId },
        order: { order: "ASC" }
      }),
      this.riegoRepository.findOne({
        where: { visitaId }
      }),
      this.laborRepository.find({
        where: { visitaId },
        relations: ["laborCultural"]
      })
    ]);

    const plagas = observaciones
      .filter((o) => o.plagaEnfermedad?.type === "plaga")
      .map((o) => ({
        objetivoId: o.plagaEnfermedadId,
        nombre: o.plagaEnfermedad?.name ?? "Desconocida",
        incidencia: o.nivelIncidencia?.name ?? "No especificada",
        severidad: o.nivelSeveridad?.name ?? "No especificada",
        organos: (o.organosAfectados ?? []).map((oa) => oa.organo ?? "Sin especificar"),
        incidenceGrade: o.nivelIncidencia?.grade ?? 0
      }));

    const enfermedades = observaciones
      .filter((o) => o.plagaEnfermedad?.type === "enfermedad")
      .map((o) => ({
        objetivoId: o.plagaEnfermedadId,
        nombre: o.plagaEnfermedad?.name ?? "Desconocida",
        incidencia: o.nivelIncidencia?.name ?? "No especificada",
        severidad: o.nivelSeveridad?.name ?? "No especificada",
        organos: (o.organosAfectados ?? []).map((oa) => oa.organo ?? "Sin especificar"),
        incidenceGrade: resolveDiseaseIncidenceGrade(Number(o.incidencePercentage ?? 0))
      }));

    const nutricion = evaluaciones
      .filter((e) => e.description?.startsWith("Nutricion - "))
      .map((e) => {
        const descParts = (e.description ?? "").split(" - ");
        return {
          elemento: descParts[1] ?? e.description ?? "Sin especificar",
          incidencia: e.incidencePercentage
            ? `${e.incidencePercentage}%`
            : "No especificada",
          severidad: e.percentage ? `${e.percentage}%` : "No especificada",
          incidenceGrade: resolveNutritionGrade(Number(e.incidencePercentage ?? 0))
        };
      });

    const result: ConsolidacionHallazgo = {
      etapaFenologica,
      plagas,
      enfermedades,
      nutricion,
      riego: {
        humedadSuelo: riego?.humedadSuelo ?? null,
        estresHidrico: riego?.estresHidrico ?? null
      },
      labores: labores.map((l) => ({
        nombre: l.laborCultural?.name ?? "Sin especificar",
        categoria: l.laborCultural?.categoryName ?? "General"
      }))
    };

    return createSuccessResponse(result);
  }
}

function resolveNutritionGrade(percentage: number) {
  if (percentage <= 0) return 0;
  if (percentage <= 5) return 1;
  if (percentage <= 20) return 2;
  return 3;
}
