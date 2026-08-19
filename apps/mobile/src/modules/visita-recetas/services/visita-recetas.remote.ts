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
  mezclas: Array<{
    numero: number;
    coadyuvantesIds?: string | null;
    coadyuvantesDosis?: string | null;
    ordenMezcla?: string | null;
    volumenAplicacion?: number | null;
    factor: number;
    factorEditable: boolean;
    cantidadTotalProducto?: number | null;
    productos: Array<{
      productoRef?: string;
      objetivo: "plaga" | "enfermedad";
      objetivoNombre: string;
      enfoque?: "reactivo" | "preventivo";
      objetivoId?: number | null;
      incidenciaGrado?: number | null;
      severidadGrado?: number | null;
      tipoControlId?: number | null;
      tipoProductoId?: number | null;
      disolvente?: string;
      modoAccionId?: number | null;
      ingredienteActivoNombre?: string | null;
      dosisProducto?: number | null;
      unidadDosis?: string | null;
      marcaProductoNombre?: string | null;
      concentracionProducto?: number | null;
      cantidadTotalProducto?: number | null;
    }>;
  }>;
  fertilizacion: Array<{
    productoRef?: string;
    mezclaNumero?: number;
    enfoque?: "reactivo" | "preventivo";
    nutrienteId?: string | null;
    viaAplicacion: "edafica" | "foliar";
    fertilizanteNombre?: string | null;
    tipoProducto?: "solido" | "liquido" | null;
    dosis?: number | null;
    unidadDosis?: string | null;
    cantidadTotalPlantas?: number | null;
    volumenAplicacion?: number | null;
    cantidadTotalFertilizante?: number | null;
    factor: number;
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
    return apiRequest<VisitaRecetaCompleta | null>(`/visitas-campo/${visitaId}/receta`);
  },

  getConsolidacion(visitaId: string) {
    return apiRequest<ConsolidacionHallazgo>(
      `/visitas-campo/${visitaId}/receta/consolidacion`
    );
  },

  save(visitaId: string, input: SaveRecetaInput, context: ApiRequestContext = {}) {
    return apiRequest<VisitaRecetaCompleta>(`/visitas-campo/${visitaId}/receta`, {
      method: "POST",
      body: input,
      ...context
    });
  },

  finalize(
    visitaId: string,
    input: SaveRecetaInput & { endVisitTime: string },
    context: ApiRequestContext = {}
  ) {
    return apiRequest<VisitaRecetaCompleta>(
      `/visitas-campo/${visitaId}/receta/finalizacion`,
      {
        method: "PUT",
        body: input,
        ...context
      }
    );
  },

  crearIngredienteActivo(draft: Record<string, unknown>) {
    return apiRequest<Record<string, unknown>>("/ingredientes-activos", {
      method: "POST",
      body: draft
    });
  },

  crearFertilizante(draft: Record<string, unknown>) {
    return apiRequest<Record<string, unknown>>("/fertilizantes", {
      method: "POST",
      body: draft
    });
  },

  crearMarcaProducto(draft: Record<string, unknown>) {
    return apiRequest<Record<string, unknown>>("/marcas-producto", {
      method: "POST",
      body: draft
    });
  }
};
