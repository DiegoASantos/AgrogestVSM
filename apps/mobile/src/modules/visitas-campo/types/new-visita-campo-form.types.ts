export type NewVisitaCampoFormValues = {
  crop: string;
  variety: string;
  parcelaId: string;
  parcelaLabel: string;
  campaign: string;
  plantsCount: string;
  areaHectares: string;
  sowingDate: string;
  visitDate: string;
  startVisitTime: string;
  phenologicalStage: string;
  subEtapaId: string;
  subEtapaPercentage: string;
  generalObservation: string;
};

export type NewVisitaCampoFormErrors = Partial<
  Record<
    | "crop"
    | "variety"
    | "campaign"
    | "parcelaId"
    | "plantsCount"
    | "areaHectares"
    | "sowingDate"
    | "visitDate"
    | "startVisitTime"
    | "phenologicalStage"
    | "subEtapaPercentage",
    string
  >
>;
