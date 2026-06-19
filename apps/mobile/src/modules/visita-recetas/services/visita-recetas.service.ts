import { visitaRecetasRepository } from "../repositories/visita-recetas.repository";
import { visitaRecetasRemote } from "./visita-recetas.remote";
import type { VisitaRecetaCompleta, ConsolidacionHallazgo } from "../types";

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

  async fetchConsolidacionFromRemote(
    visitaId: string
  ): Promise<ConsolidacionHallazgo> {
    return visitaRecetasRemote.getConsolidacion(visitaId);
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
