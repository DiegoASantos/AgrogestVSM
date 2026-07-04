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
  sowingDate: string | null;
  visitDate: string;
  startVisitTime: string;
  endVisitTime: string | null;
  phenologicalStageId: string | null;
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
  description: string;
};

export type VisitaObservacionSanitaria = {
  id: string;
  visitaId: string;
  pestDiseaseId: string;
  incidenceLevelId: string | null;
  observation: string;
};

export type VisitaRiego = {
  id: string;
  visitaId: string;
  tipoRiegoId: string;
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
  sectorId: string;
};

export type PhenologicalStageLookupItem = LookupItem & {
  cultivoId: string;
  description: string | null;
};

export type PestDiseaseLookupItem = LookupItem & {
  scientificName: string | null;
  type: string;
};

export type IncidenceLevelLookupItem = LookupItem & {
  sortOrder: number | null;
  type?: "incidencia" | "severidad";
};

export type VisitaDetailData = {
  visita: VisitaCampo;
  evaluaciones: VisitaEvaluacion[];
  observacionesSanitarias: VisitaObservacionSanitaria[];
  riego: VisitaRiego | null;
  laboresCulturales: VisitaLaborCultural[];
  calificaciones: VisitaCalificacion[];
  lookups: {
    agronomist: LookupItem | null;
    crop: CropLookupItem | null;
    variety: VarietyLookupItem | null;
    parcela: ParcelaLookupItem | null;
    campaign: CampaignLookupItem | null;
    phenologicalStage: PhenologicalStageLookupItem | null;
    pestDiseases: PestDiseaseLookupItem[];
    incidenceLevels: IncidenceLevelLookupItem[];
  };
};
