export type CoadyuvanteCatalogItem = {
  id: string;
  name: string;
  description: string | null;
};

export type IngredienteActivoCatalogItem = {
  id: string;
  name: string;
  description: string | null;
};

export type MarcaProductoCatalogItem = {
  id: string;
  name: string;
  ingredienteActivoId: string | null;
  ingredienteActivoNombre: string | null;
  concentracion: number | null;
};

export type ModoAccionCatalogItem = {
  id: string;
  name: string;
};

export type TipoControlCatalogItem = {
  id: string;
  name: string;
};

export type TipoProductoFitosanitarioCatalogItem = {
  id: string;
  name: string;
};

export type FertilizanteCatalogItem = {
  id: string;
  name: string;
  type: "solido" | "liquido";
};

export type RecetaFitosanidad = {
  id: string;
  serverId: string | null;
  recetaLocalId: string;
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
  syncStatus: "pending" | "synced" | "error";
  createdAt: string;
  updatedAt: string;
};

export type RecetaFertilizacion = {
  id: string;
  serverId: string | null;
  recetaLocalId: string;
  viaAplicacion: "edafica" | "foliar";
  fertilizanteNombre: string | null;
  tipoProducto: "solido" | "liquido" | null;
  dosis: number | null;
  unidadDosis: string | null;
  cantidadTotalPlantas: number | null;
  volumenAplicacion: number | null;
  cantidadTotalFertilizante: number | null;
  syncStatus: "pending" | "synced" | "error";
  createdAt: string;
  updatedAt: string;
};

export type RecetaRiego = {
  id: string;
  serverId: string | null;
  recetaLocalId: string;
  tipoRecomendacion:
    | "riego_pesado"
    | "riego_ligero"
    | "inicio_agoste"
    | "ruptura_agoste";
  syncStatus: "pending" | "synced" | "error";
  createdAt: string;
  updatedAt: string;
};

export type RecetaLabor = {
  id: string;
  serverId: string | null;
  recetaLocalId: string;
  labor:
    | "limpieza_maleza_pala"
    | "limpieza_maleza_motoguadana"
    | "horqueteo"
    | "enzunchado"
    | "recoleccion_frutos"
    | "trampas_mosca";
  syncStatus: "pending" | "synced" | "error";
  createdAt: string;
  updatedAt: string;
};

export type VisitaReceta = {
  id: string;
  serverId: string | null;
  visitaLocalId: string;
  etapaFenologica: string | null;
  version: number;
  syncStatus: "pending" | "synced" | "error";
  syncErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VisitaRecetaCompleta = VisitaReceta & {
  fitosanidad: RecetaFitosanidad[];
  fertilizacion: RecetaFertilizacion[];
  riego: RecetaRiego | null;
  labores: RecetaLabor[];
};

export type ConsolidacionHallazgo = {
  etapaFenologica: string | null;
  plagas: Array<{
    nombre: string;
    incidencia: string;
    severidad: string;
    organos: string[];
  }>;
  enfermedades: Array<{
    nombre: string;
    incidencia: string;
    severidad: string;
    organos: string[];
  }>;
  nutricion: Array<{
    elemento: string;
    incidencia: string;
    severidad: string;
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

export const RIEGO_RECOMENDACION_LABELS: Record<
  RecetaRiego["tipoRecomendacion"],
  string
> = {
  riego_pesado: "Riego pesado",
  riego_ligero: "Riego ligero",
  inicio_agoste: "Inicio de agoste",
  ruptura_agoste: "Ruptura de agoste"
};

export const RIEGO_RECOMENDACION_DESCRIPTIONS: Record<
  RecetaRiego["tipoRecomendacion"],
  string
> = {
  riego_pesado:
    "Aplicar grandes volumenes de agua sobre la superficie del terreno.",
  riego_ligero:
    "Aplicar una lamina de agua de bajo volumen para humedecer superficialmente.",
  inicio_agoste:
    "Suspension total o restriccion del riego por 45-60 dias dependiendo del cultivo.",
  ruptura_agoste:
    "Riego ligero inmediatamente despues de obtener floracion para estimular flor sana y activar el sistema radicular."
};

export const LABOR_RECOMENDACION_LABELS: Record<
  RecetaLabor["labor"],
  string
> = {
  limpieza_maleza_pala: "Limpieza de maleza con pala",
  limpieza_maleza_motoguadana: "Limpieza de maleza con motoguadana",
  horqueteo: "Horqueteo",
  enzunchado: "Enzunchado",
  recoleccion_frutos: "Recoleccion y manejo de frutos caidos",
  trampas_mosca: "Colocacion de trampas de mosca de la fruta"
};

export const LABOR_RECOMENDACION_DESCRIPTIONS: Record<
  RecetaLabor["labor"],
  string
> = {
  limpieza_maleza_pala:
    "Eliminacion de hierbas con herramienta de campo.",
  limpieza_maleza_motoguadana:
    "Eliminacion de hierbas con herramienta mecanizada de rapido avance.",
  horqueteo:
    "Colocar horquetas de madera debajo de las ramas principales para sostener el peso de la fruta.",
  enzunchado:
    "Amarrar y asegurar las ramas principales hacia el centro para evitar que el peso quiebre las ramas.",
  recoleccion_frutos:
    "Evitar que plagas y enfermedades completen su ciclo biologico en el suelo.",
  trampas_mosca:
    "Monitoreo y captura masiva de mosca de la fruta."
};
