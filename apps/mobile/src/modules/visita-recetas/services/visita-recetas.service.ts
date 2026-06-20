import { visitaRecetasRepository } from "../repositories/visita-recetas.repository";
import { visitaRecetasRemote } from "./visita-recetas.remote";
import { evaluacionesRepository } from "../../evaluaciones/repositories/evaluaciones.repository";
import { laboresCulturalesVisitaRepository } from "../../labores-culturales-visita/repositories/labores-culturales-visita.repository";
import { observacionesSanitariasRepository } from "../../observaciones-sanitarias/repositories/observaciones-sanitarias.repository";
import { HUMEDAD_SUELO_LABELS } from "../../riegos/types";
import { riegosRepository } from "../../riegos/repositories/riegos.repository";
import { visitasCampoRepository } from "../../visitas-campo/repositories/visitas-campo.repository";
import type { VisitaRecetaCompleta, ConsolidacionHallazgo } from "../types";

const NUTRITION_DESCRIPTION_PREFIX = "Nutricion -";

export type SaveRecetaData = {
  etapaFenologica: string | null;
  fitosanidad: Array<{
    numero: number;
    objetivo: "plaga" | "enfermedad";
    objetivoNombre: string;
    tipoControlId: string | null;
    tipoProductoId: string | null;
    disolvente: string;
    modoAccionId: string | null;
    ingredienteActivoNombre: string | null;
    dosisIa: number | null;
    volumenAplicacion: number | null;
    cantidadTotalIa: number | null;
    marcaProductoNombre: string | null;
    concentracionProducto: number | null;
    cantidadTotalProducto: number | null;
    coadyuvantesIds: string | null;
    ordenMezcla: string | null;
  }>;
  fertilizacion: Array<{
    viaAplicacion: "edafica" | "foliar";
    fertilizanteNombre: string | null;
    tipoProducto: "solido" | "liquido" | null;
    dosis: number | null;
    unidadDosis: string | null;
    cantidadTotalPlantas: number | null;
    volumenAplicacion: number | null;
    cantidadTotalFertilizante: number | null;
  }>;
  riego: { tipoRecomendacion: string } | null;
  labores: string[];
};

export const visitaRecetasService = {
  getCatalogos() {
    return {
      coadyuvantes: visitaRecetasRepository.getCoadyuvantes(),
      ingredientesActivos: visitaRecetasRepository.getIngredientesActivos(),
      marcasProducto: visitaRecetasRepository.getMarcasProducto(),
      modosAccion: visitaRecetasRepository.getModosAccion(),
      tiposControl: visitaRecetasRepository.getTiposControl(),
      tiposProducto: visitaRecetasRepository.getTiposProducto(),
      fertilizantes: visitaRecetasRepository.getFertilizantes()
    };
  },

  getByVisitaId(visitaId: string): VisitaRecetaCompleta | null {
    return visitaRecetasRepository.getRecetaByVisitaLocalId(visitaId);
  },

  save(visitaId: string, data: SaveRecetaData): VisitaRecetaCompleta {
    return visitaRecetasRepository.saveReceta(visitaId, data);
  },

  async fetchConsolidacionFromRemote(visitaId: string): Promise<ConsolidacionHallazgo> {
    return visitaRecetasRemote.getConsolidacion(visitaId);
  },

  getConsolidacionLocal(visitaId: string): ConsolidacionHallazgo {
    const visita = visitasCampoRepository.getById(visitaId);
    const pestDiseases = observacionesSanitariasRepository.getPestDiseases();
    const incidenceLevels = observacionesSanitariasRepository.getIncidenceLevels();
    const observaciones = observacionesSanitariasRepository.getByVisitaLocalId(visitaId);
    const visitaRiego = riegosRepository.getByVisitaLocalId(visitaId);
    const laboresCatalog = laboresCulturalesVisitaRepository.getLaboresCulturales();
    const laboresSeleccionadas =
      laboresCulturalesVisitaRepository.getByVisitaLocalId(visitaId);
    const evaluaciones = evaluacionesRepository.getByVisitaLocalId(visitaId);
    const pestById = new Map(pestDiseases.map((pest) => [pest.id, pest]));
    const levelById = new Map(incidenceLevels.map((level) => [level.id, level]));
    const laborById = new Map(laboresCatalog.map((labor) => [labor.id, labor]));
    const plagas: ConsolidacionHallazgo["plagas"] = [];
    const enfermedades: ConsolidacionHallazgo["enfermedades"] = [];

    for (const observacion of observaciones) {
      const pest = pestById.get(observacion.pestDiseaseId);

      if (!pest) {
        continue;
      }

      const item = {
        nombre: pest.name,
        incidencia:
          observacion.incidencePercentage !== null
            ? `${observacion.incidencePercentage}%`
            : ((observacion.incidenceLevelId
                ? levelById.get(observacion.incidenceLevelId)?.name
                : null) ?? "No especificada"),
        severidad:
          (observacion.severityLevelId
            ? levelById.get(observacion.severityLevelId)?.name
            : null) ?? "No especificada",
        organos: observacion.organosAfectados
      };

      if (pest.type === "enfermedad") {
        enfermedades.push(item);
      } else if (pest.type === "plaga") {
        plagas.push(item);
      }
    }

    const nutricion = evaluaciones
      .filter((evaluacion) =>
        evaluacion.description.startsWith(NUTRITION_DESCRIPTION_PREFIX)
      )
      .map((evaluacion) => {
        const parsed = parseNutritionEvaluationDescription(evaluacion.description);

        return {
          elemento: parsed.elemento,
          incidencia: evaluacion.incidencePercentage
            ? `${evaluacion.incidencePercentage}%`
            : "No especificada",
          severidad: parsed.severidad ?? "No especificada"
        };
      });

    const labores = laboresSeleccionadas.map((seleccion) => {
      const labor = laborById.get(seleccion.laborCulturalId);

      return {
        nombre: labor?.categoryName ?? labor?.name ?? seleccion.laborCulturalId,
        categoria: labor?.optionLabel ?? labor?.name ?? "No especificado"
      };
    });

    let etapaFenologica: string | null = null;

    if (visita?.phenologicalStageId) {
      const etapas = visitasCampoRepository.getEtapasFenologicasByCultivo(visita.cropId);
      const etapa = etapas.find((e) => e.id === visita.phenologicalStageId);

      if (etapa) {
        if (visita.subEtapaId) {
          const subEtapas = visitasCampoRepository.getSubEtapasByEtapaFenologica(
            visita.phenologicalStageId
          );
          const subEtapa = subEtapas.find((s) => s.id === visita.subEtapaId);

          if (subEtapa) {
            etapaFenologica = `${etapa.name} - ${subEtapa.name} (${subEtapa.percentage ?? visita.subEtapaPercentage ?? ""}%)`;
          } else {
            etapaFenologica = `${etapa.name}${visita.subEtapaPercentage !== null ? ` (${visita.subEtapaPercentage}%)` : ""}`;
          }
        } else if (visita.subEtapaPercentage !== null) {
          etapaFenologica = `${etapa.name} (${visita.subEtapaPercentage}%)`;
        } else {
          etapaFenologica = etapa.name;
        }
      } else {
        etapaFenologica = visita.phenologicalStageId;
      }
    }

    return {
      etapaFenologica,
      plagas,
      enfermedades,
      nutricion,
      riego: {
        humedadSuelo: visitaRiego?.humedadSuelo
          ? HUMEDAD_SUELO_LABELS[visitaRiego.humedadSuelo]
          : null,
        estresHidrico: visitaRiego?.estresHidrico ?? null
      },
      labores
    };
  },

  async syncToRemote(
    visitaId: string,
    data: SaveRecetaData
  ): Promise<VisitaRecetaCompleta> {
    const remoteData = {
      etapaFenologica: data.etapaFenologica ?? undefined,
      fitosanidad: data.fitosanidad.map((f) => ({
        numero: f.numero,
        objetivo: f.objetivo,
        objetivoNombre: f.objetivoNombre,
        tipoControlId: f.tipoControlId ? Number(f.tipoControlId) : undefined,
        tipoProductoId: f.tipoProductoId ? Number(f.tipoProductoId) : undefined,
        disolvente: f.disolvente,
        modoAccionId: f.modoAccionId ? Number(f.modoAccionId) : undefined,
        ingredienteActivoNombre: f.ingredienteActivoNombre ?? undefined,
        dosisIa: f.dosisIa ?? undefined,
        volumenAplicacion: f.volumenAplicacion ?? undefined,
        cantidadTotalIa: f.cantidadTotalIa ?? undefined,
        marcaProductoNombre: f.marcaProductoNombre ?? undefined,
        concentracionProducto: f.concentracionProducto ?? undefined,
        cantidadTotalProducto: f.cantidadTotalProducto ?? undefined,
        coadyuvantesIds: f.coadyuvantesIds ?? undefined,
        ordenMezcla: f.ordenMezcla ?? undefined
      })),
      fertilizacion: data.fertilizacion.map((f) => ({
        viaAplicacion: f.viaAplicacion,
        fertilizanteNombre: f.fertilizanteNombre ?? undefined,
        tipoProducto: f.tipoProducto ?? undefined,
        dosis: f.dosis ?? undefined,
        unidadDosis: f.unidadDosis ?? undefined,
        cantidadTotalPlantas: f.cantidadTotalPlantas ?? undefined,
        volumenAplicacion: f.volumenAplicacion ?? undefined,
        cantidadTotalFertilizante: f.cantidadTotalFertilizante ?? undefined
      })),
      riego: data.riego ?? undefined,
      labores: data.labores.map((l) => ({ labor: l }))
    };

    return visitaRecetasRemote.save(visitaId, remoteData);
  }
};

function parseNutritionEvaluationDescription(description: string) {
  const payload = description.startsWith(NUTRITION_DESCRIPTION_PREFIX)
    ? description.slice(NUTRITION_DESCRIPTION_PREFIX.length).trim()
    : description;
  const [elementoRaw, detailsRaw = ""] = payload.split(":");
  const severityMatch = detailsRaw.match(/Severidad\s+(.+)$/i);

  return {
    elemento: elementoRaw.trim() || "No especificado",
    severidad: severityMatch?.[1]?.trim() ?? null
  };
}
