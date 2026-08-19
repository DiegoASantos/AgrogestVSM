export type VisitaListFilters = {
  agronomistUserId: string;
  productorId: string;
  campaignId: string;
  parcelaId: string;
  startDate: string;
  endDate: string;
};

export type VisitaCampo = {
  id: string;
  publicId: string;
  nroFicha: string | null;
  cropId: string;
  varietyId: string;
  parcelaId: string;
  campaignId: string;
  agronomistUserId: string;
  plantsCount: number | null;
  areaHectares: string | null;
  sowingDate: string | null;
  visitDate: string;
  startVisitTime: string;
  endVisitTime: string | null;
  phenologicalStageId: string | null;
  subEtapaId: string | null;
  subEtapaPercentage: number | null;
  generalObservation: string | null;
  synchronizedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VisitaEvaluacion = {
  id: string;
  visitaId: string;
  order: number;
  percentage: number | null;
  incidencePercentage: string | null;
  description: string;
  organosAfectados: string[];
};

export type VisitaObservacionSanitaria = {
  id: string;
  visitaId: string;
  pestDiseaseId: string;
  incidenceLevelId: string | null;
  severityLevelId: string | null;
  incidencePercentage: string | null;
  observation: string | null;
  organosAfectados: string[];
};

export type VisitaRiego = {
  id: string;
  visitaId: string;
  tipoRiegoId: string;
  fuenteAgua: string | null;
  tipoSuelo: string | null;
  humedadSuelo: string | null;
  estresHidrico: boolean | null;
};

export type LaborCulturalLookupItem = LookupItem & {
  description: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  optionCode: string | null;
  optionLabel: string | null;
  legend: string | null;
  sortOrder: number | null;
  isActive: boolean;
};

export type VisitaLaborCultural = {
  id: string;
  visitaId: string;
  laborCulturalId: string;
  laborCultural: LaborCulturalLookupItem | null;
};

export type CalificacionModulo =
  | "plagas"
  | "enfermedades"
  | "nutricion"
  | "riego"
  | "labores";

export type VisitaCalificacion = {
  id: string;
  visitaId: string;
  modulo: CalificacionModulo;
  puntaje: number;
  observacion: string | null;
};

export type ScorePorModulo = Record<CalificacionModulo, number | null>;

export type TechnicalModuleScore = {
  score: number | null;
  percentage: number | null;
  semaphore: "verde" | "amarillo" | "rojo" | null;
};

export type PestTechnicalScoreItem = {
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

export type PestModuleTechnicalDetail = {
  moduleFormula: string;
  appliedFormula: string;
  moduleScore: number;
  modulePercentage: number;
  semaphore: "verde" | "amarillo" | "rojo";
  status: string;
  message: string;
  pestScores: PestTechnicalScoreItem[];
};

export type DiseaseTechnicalScoreItem = {
  key: string;
  pestDiseaseId: string | null;
  name: string;
  evaluated: boolean;
  incidencePercentage: number;
  incidenceGrade: number;
  severityGrade: number;
  score: number;
  formula: string;
};

export type DiseaseModuleTechnicalDetail = {
  moduleFormula: string;
  appliedFormula: string;
  moduleScore: number;
  modulePercentage: number;
  semaphore: "verde" | "amarillo" | "rojo";
  status: string;
  message: string;
  diseaseScores: DiseaseTechnicalScoreItem[];
};

export type NutritionTechnicalScoreItem = {
  key: string;
  nutrientId: string | null;
  name: string;
  evaluated: boolean;
  incidencePercentage: number;
  incidenceGrade: number;
  score: number;
  formula: string;
};

export type NutritionModuleTechnicalDetail = {
  moduleFormula: string;
  appliedFormula: string;
  moduleScore: number;
  modulePercentage: number;
  semaphore: "verde" | "amarillo" | "rojo";
  status: string;
  message: string;
  nutritionScores: NutritionTechnicalScoreItem[];
};

export type RiegoModuleTechnicalDetail = {
  moduleScore: number;
  modulePercentage: number;
  semaphore: "verde" | "amarillo" | "rojo";
  status: string;
  message: string;
};

export type LaborTechnicalScoreItem = {
  categoryCode: string;
  categoryName: string;
  optionCode: string;
  optionName: string;
  score: number;
  weight: number;
};

export type LaborModuleTechnicalDetail = {
  moduleScore: number;
  modulePercentage: number;
  semaphore: "verde" | "amarillo" | "rojo";
  status: string;
  message: string;
  laborScores: LaborTechnicalScoreItem[];
};

export type TechnicalVisitScores = {
  visitaId: string;
  scoreTecnicoGeneral: number | null;
  scoreTecnicoGeneralEscala: number | null;
  globalSemaphore: "verde" | "amarillo" | "rojo" | null;
  modulosIncluidos: CalificacionModulo[];
  modulosFaltantes: CalificacionModulo[];
  scorePorModulo: Record<CalificacionModulo, TechnicalModuleScore>;
  detallePlagas: PestModuleTechnicalDetail | null;
  detalleEnfermedades: DiseaseModuleTechnicalDetail | null;
  detalleNutricion: NutritionModuleTechnicalDetail | null;
  detalleRiego: RiegoModuleTechnicalDetail | null;
  detalleLabores: LaborModuleTechnicalDetail | null;
};

export type ProductorCalificacion = {
  productorId: string;
  scoreGeneral: number | null;
  scorePorCampania: Record<
    string,
    {
      scoreGeneral: number | null;
      scorePorModulo: ScorePorModulo;
    }
  >;
  totalVisitas: number;
  totalVisitasCalificadas: number;
};

export type ProductorFilterOption = {
  id: string;
  label: string;
};

export type CampaignFilterOption = {
  id: string;
  label: string;
};

export type ParcelaFilterOption = {
  id: string;
  label: string;
};

export type AgronomistFilterOption = {
  id: string;
  label: string;
};

export type VisitaFilterCatalogs = {
  productores: ProductorFilterOption[];
  campanias: CampaignFilterOption[];
  parcelas: ParcelaFilterOption[];
  agronomos: AgronomistFilterOption[];
};

export type VisitaListResponse = {
  items: VisitaCampo[];
  count: number;
  page: number;
  totalPages: number;
};

export type PaginatedResult = {
  page: number;
  totalPages: number;
};

export type ProductorVisitasHistory = {
  productor: {
    id: string;
    publicId: string;
    entityType: "persona" | "fundo" | "cooperativa";
    documentTypeId: number | null;
    documentNumber: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    isActive: boolean;
  };
  filters: {
    campaignId: string | null;
    agronomistUserId: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  visitas: VisitaCampo[];
  count: number;
  page: number;
  totalPages: number;
};

export type ParcelaVisitadaPorAgronomo = {
  parcelaId: string;
  parcelaLabel: string;
  visitCount: number;
  firstVisitDate: string;
  lastVisitDate: string;
};

export type ParcelasVisitadasPorAgronomoResponse = {
  agronomistUserId: string;
  agronomistLabel: string;
  parcelas: ParcelaVisitadaPorAgronomo[];
  totalVisitas: number;
};

export type ParcelaVisitasHistory = {
  parcela: {
    id: string;
    publicId: string;
    sectorId: string;
    code: string;
    name: string | null;
    isActive: boolean;
  };
  visitas: VisitaCampo[];
  count: number;
  page: number;
  totalPages: number;
  lookups: {
    sector: LookupItem | null;
  };
};

export type LookupItem = {
  id: string;
  name: string;
};

export type CropLookupItem = LookupItem & {
  code: string;
};

export type VarietyLookupItem = LookupItem & {
  code: string;
  cultivoId: string;
};

export type CampaignLookupItem = LookupItem & {
  cultivoId: string;
  startDate: string;
  endDate: string;
};

export type ParcelaLookupItem = LookupItem & {
  code: string;
  productorId: string;
  sectorId: string;
  areaHectares: string | null;
};

export type PhenologicalStageLookupItem = LookupItem & {
  cultivoId: string;
  description: string | null;
};

export type SubEtapaLookupItem = LookupItem & {
  etapaFenologicaId: string;
  sortOrder: number;
  description: string | null;
  percentage: number | null;
};

export type PestDiseaseLookupItem = LookupItem & {
  scientificName: string | null;
  type: string;
  code?: string | null;
};

export type IncidenceLevelLookupItem = LookupItem & {
  sortOrder: number | null;
  grade: number;
  type?: "incidencia" | "severidad";
};

export type TipoRiegoLookupItem = LookupItem & {
  description: string | null;
};

export type ProductorLookupItem = {
  id: string;
  publicId: string;
  entityType: "persona" | "fundo" | "cooperativa";
  documentNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
};

export type VisitaStepNote = {
  id: string;
  visitaId: string;
  stepNumber: number;
  observation: string | null;
  recommendation: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CoadyuvanteCatalogItem = LookupItem & {
  description: string | null;
};

export type RecetaFitosanidad = {
  id: string;
  numero: number;
  objetivo: "plaga" | "enfermedad";
  objetivoNombre: string;
  tipoControlId: string | null;
  tipoProductoId: string | null;
  disolvente: string;
  modoAccionId: string | null;
  ingredienteActivoNombre: string | null;
  dosisIa: number | null;
  unidadDosis?: string | null;
  volumenAplicacion: number | null;
  cantidadTotalIa: number | null;
  marcaProductoNombre: string | null;
  concentracionProducto: number | null;
  cantidadTotalProducto: number | null;
  coadyuvantesIds: string | null;
  ordenMezcla: string | null;
};

export type RecetaMezclaProducto = {
  id: string;
  productoRef?: string;
  objetivo: "plaga" | "enfermedad";
  objetivoNombre: string;
  ingredienteActivoNombre: string | null;
  dosisProducto: number | null;
  unidadDosis?: string | null;
  marcaProductoNombre: string | null;
};

export type RecetaMezcla = {
  id: string;
  numero: number;
  coadyuvantesIds: string | null;
  coadyuvantesDosis?: string | null;
  ordenMezcla: string | null;
  productos: RecetaMezclaProducto[];
};

export type RecetaFertilizacion = {
  id: string;
  mezclaNumero?: number | null;
  enfoque?: "reactivo" | "preventivo";
  nutrienteId?: string | null;
  nutrienteNombre?: string | null;
  viaAplicacion: "edafica" | "foliar";
  fertilizanteNombre: string | null;
  tipoProducto: "solido" | "liquido" | null;
  dosis: number | null;
  unidadDosis: string | null;
  cantidadTotalPlantas: number | null;
  volumenAplicacion: number | null;
  cantidadTotalFertilizante: number | null;
  factor?: number;
};

export type RecetaRiego = {
  id: string;
  tipoRecomendacion: string;
};

export type RecetaLabor = {
  id: string;
  labor: string;
};

export type VisitaRecetaCompleta = {
  id: string;
  visitaId: string;
  etapaFenologica: string | null;
  version: number;
  mezclas?: RecetaMezcla[];
  fitosanidad: RecetaFitosanidad[];
  fertilizacion: RecetaFertilizacion[];
  riego: RecetaRiego | null;
  labores: RecetaLabor[];
  createdAt: string;
  updatedAt: string;
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

export type VisitaDetailData = {
  visita: VisitaCampo;
  evaluaciones: VisitaEvaluacion[];
  observacionesSanitarias: VisitaObservacionSanitaria[];
  riego: VisitaRiego | null;
  laboresCulturales: VisitaLaborCultural[];
  calificaciones: VisitaCalificacion[];
  stepNotes: VisitaStepNote[];
  technicalScores: TechnicalVisitScores | null;
  lookups: {
    agronomist: LookupItem | null;
    crop: CropLookupItem | null;
    variety: VarietyLookupItem | null;
    parcela: ParcelaLookupItem | null;
    productor: ProductorLookupItem | null;
    campaign: CampaignLookupItem | null;
    phenologicalStage: PhenologicalStageLookupItem | null;
    subEtapas: SubEtapaLookupItem[];
    pestDiseases: PestDiseaseLookupItem[];
    incidenceLevels: IncidenceLevelLookupItem[];
    tiposRiego: TipoRiegoLookupItem[];
  };
};
