import { apiRequest, type ApiRequestContext } from "../../../shared/services";
import type {
  CoadyuvanteCatalogItem,
  IngredienteActivoCatalogItem,
  MarcaProductoCatalogItem,
  ModoAccionCatalogItem,
  TipoControlCatalogItem,
  TipoProductoFitosanitarioCatalogItem,
  FertilizanteCatalogItem,
  VisitaRecetaCompleta,
  ConsolidacionHallazgo
} from "../types";

export type SaveRecetaInput = {
  etapaFenologica?: string | null;
  fitosanidad: Array<{
    numero: number;
    objetivo: "plaga" | "enfermedad";
    objetivoNombre: string;
    tipoControlId?: number | null;
    tipoProductoId?: number | null;
    disolvente?: string;
    modoAccionId?: number | null;
    ingredienteActivoNombre?: string | null;
    dosisIa?: number | null;
    volumenAplicacion?: number | null;
    cantidadTotalIa?: number | null;
    marcaProductoNombre?: string | null;
    concentracionProducto?: number | null;
    cantidadTotalProducto?: number | null;
    coadyuvantesIds?: string | null;
    ordenMezcla?: string | null;
  }>;
  fertilizacion: Array<{
    viaAplicacion: "edafica" | "foliar";
    fertilizanteNombre?: string | null;
    tipoProducto?: "solido" | "liquido" | null;
    dosis?: number | null;
    unidadDosis?: string | null;
    cantidadTotalPlantas?: number | null;
    volumenAplicacion?: number | null;
    cantidadTotalFertilizante?: number | null;
  }>;
  riego?: {
    tipoRecomendacion: string;
  } | null;
  labores: Array<{
    labor: string;
  }>;
};

export const visitaRecetasRemote = {
  getCoadyuvantes() {
    return apiRequest<CoadyuvanteCatalogItem[]>("/coadyuvantes");
  },

  getIngredientesActivos() {
    return apiRequest<IngredienteActivoCatalogItem[]>("/ingredientes-activos");
  },

  getMarcasProducto() {
    return apiRequest<MarcaProductoCatalogItem[]>("/marcas-producto");
  },

  getModosAccion() {
    return apiRequest<ModoAccionCatalogItem[]>("/modos-accion");
  },

  getTiposControl() {
    return apiRequest<TipoControlCatalogItem[]>("/tipos-control");
  },

  getTiposProductoFitosanitario() {
    return apiRequest<TipoProductoFitosanitarioCatalogItem[]>(
      "/tipos-producto-fitosanitario"
    );
  },

  getFertilizantes() {
    return apiRequest<FertilizanteCatalogItem[]>("/fertilizantes");
  },

  getByVisitaId(visitaId: string) {
    return apiRequest<VisitaRecetaCompleta | null>(
      `/visitas-campo/${visitaId}/receta`
    );
  },

  getConsolidacion(visitaId: string) {
    return apiRequest<ConsolidacionHallazgo>(
      `/visitas-campo/${visitaId}/receta/consolidacion`
    );
  },

  save(visitaId: string, input: SaveRecetaInput, context: ApiRequestContext = {}) {
    return apiRequest<VisitaRecetaCompleta>(
      `/visitas-campo/${visitaId}/receta`,
      {
        method: "POST",
        body: input,
        ...context
      }
    );
  }
};
