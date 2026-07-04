export type VisitasPorMes = {
  mes: string;
  count: number;
};

export type VisitasPorCampania = {
  campania: string;
  count: number;
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
};
