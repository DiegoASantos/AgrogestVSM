export type VisitasPorMes = {
  mes: string;
  count: number;
};

export type VisitasPorCampania = {
  campania: string;
  count: number;
};

export type DashboardDateRange = {
  startDate: string;
  endDate: string;
};

export type VisitasPorAgronomo = {
  agronomistUserId: string;
  agronomistName: string;
  count: number;
};

export type EtapaFenologicaDashboardOption = {
  id: string;
  name: string;
  type: "Etapa" | "Labor";
};

export type ParcelasPorEtapa = {
  etapaFenologicaId: string;
  name: string;
  type: "Etapa" | "Labor";
  count: number;
  parcelas: string[];
};

export type DashboardParcelasPorEtapaFilters = DashboardDateRange & {
  phenologicalStageId: string;
};

export type PlagaFrecuente = {
  plaga: string;
  count: number;
};

export type DeficienciaNutriente = {
  nutriente: string;
  count: number;
};

export type VisitaReciente = {
  id: string;
  parcela: string;
  fecha: string;
  agronomo: string;
};

export type RecetaReciente = {
  id: string;
  parcela: string;
  fecha: string;
  etapa: string | null;
};

export type ProductorRankingItem = {
  productorId: string;
  productorNombre: string;
  score: number;
  parcelasEvaluadas: number;
  visitasCalificadas: number;
};

export type DashboardResumen = {
  kpis: {
    totalVisitas: number;
    visitasEsteMes: number;
    productoresActivos: number;
    recetasEmitidas: number;
    cumplimientoPromedio: number | null;
  };
  charts: {
    visitasPorMes: VisitasPorMes[];
    visitasPorCampania: VisitasPorCampania[];
    plagasFrecuentes: PlagaFrecuente[];
    deficienciasNutrientes: DeficienciaNutriente[];
  };
  actividadReciente: {
    ultimasVisitas: VisitaReciente[];
    ultimasRecetas: RecetaReciente[];
  };
  rankingProductores: {
    general: ProductorRankingItem[];
    campaniaActual: {
      nombre: string | null;
      productores: ProductorRankingItem[];
    };
  };
};
