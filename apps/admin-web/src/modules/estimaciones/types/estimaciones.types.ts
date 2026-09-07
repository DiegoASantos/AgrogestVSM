export type EstimationWeekRow = {
  agronomistUserId: string;
  engineerName: string;
  isActive: boolean;
  isEditable: boolean;
  estimatePublicId: string | null;
  estimatedVisits: number | null;
  actualVisits: number;
  difference: number | null;
  compliancePercentage: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdByName: string | null;
  updatedByName: string | null;
};

export type EstimationWeekData = {
  startDate: string;
  endDate: string;
  totals: {
    agronomists: number;
    withEstimate: number;
    estimatedVisits: number;
    actualVisits: number;
    difference: number;
  };
  rows: EstimationWeekRow[];
};

export type SaveWeekEstimate = {
  agronomoUsuarioId: string;
  visitasEstimadas: number | null;
};
