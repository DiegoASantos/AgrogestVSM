export type NewVisitaCampoFormValues = {
  crop: string;
  variety: string;
  parcelaId: string;
  parcelaLabel: string;
  campaign: string;
  plantsCount: string;
  sowingDate: string;
  visitDate: string;
  startVisitTime: string;
  endVisitTime: string;
  phenologicalStage: string;
  generalObservation: string;
};

export type NewVisitaCampoFormErrors = Partial<
  Record<
    | "crop"
    | "variety"
    | "campaign"
    | "parcelaId"
    | "plantsCount"
    | "sowingDate"
    | "visitDate"
    | "startVisitTime"
    | "endVisitTime",
    string
  >
>;
