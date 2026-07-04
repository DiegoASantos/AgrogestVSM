export const CALIFICACION_MODULOS = [
  "plagas",
  "enfermedades",
  "nutricion",
  "riego",
  "labores"
] as const;

export type CalificacionModulo = (typeof CALIFICACION_MODULOS)[number];

export type VisitaCalificacion = {
  id: string;
  serverId: string | null;
  visitaId: string;
  modulo: CalificacionModulo;
  puntaje: number;
  observacion: string | null;
  syncStatus: "pending" | "synced" | "error";
  syncErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertCalificacionInput = {
  modulo: CalificacionModulo;
  puntaje: number;
  observacion?: string | null;
};

export type RecetaAnterior = {
  existe: boolean;
  visitaId?: string;
  fechaVisita?: string;
  etapaFenologicaNombre?: string | null;
  fitosanidad?: Array<{
    numero?: number;
    objetivo: "plaga" | "enfermedad";
    objetivoNombre: string;
    tipoControlId?: string | null;
    tipoProductoId?: string | null;
    disolvente?: string | null;
    modoAccionId?: string | null;
    ingredienteActivoNombre?: string | null;
    dosisIa?: number | null;
    volumenAplicacion?: number | null;
    cantidadTotalIa?: number | null;
    marcaProductoNombre?: string | null;
    concentracionProducto?: number | null;
    cantidadTotalProducto?: number | null;
  }>;
  fertilizacion?: Array<{
    viaAplicacion: "edafica" | "foliar";
    fertilizanteNombre?: string | null;
    tipoProducto?: "solido" | "liquido" | null;
    dosis?: number | null;
    unidadDosis?: string | null;
    cantidadTotalPlantas?: number | null;
    volumenAplicacion?: number | null;
    cantidadTotalFertilizante?: number | null;
  }>;
  riego?: { tipoRecomendacion: string } | null;
  labores?: Array<{ labor: string }>;
};

export type ComplianceLegendItem = {
  puntaje: number;
  title: string;
  description: string;
};

export const COMPLIANCE_LEGEND: ComplianceLegendItem[] = [
  {
    puntaje: 0,
    title: "Incumplimiento critico",
    description:
      "No aplico las recomendaciones tecnicas prescritas y genera riesgo critico."
  },
  {
    puntaje: 1,
    title: "Cumplimiento deficiente",
    description:
      "Ejecucion incompleta, extemporanea o con dosis, areas o moleculas distintas."
  },
  {
    puntaje: 2,
    title: "Cumplimiento parcial",
    description:
      "Hubo disposicion, pero con fallas en precision, calendario o prescripcion."
  },
  {
    puntaje: 3,
    title: "Cumplimiento optimo",
    description:
      "Cumplimiento estricto y oportuno de dosis, moleculas y plazos."
  }
];
