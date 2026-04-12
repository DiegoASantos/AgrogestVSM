export type VisitaEvaluacion = {
  id: string;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  visitaId: string;
  order: number;
  percentage: string | null;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type EvaluacionFormValues = {
  order: string;
  percentage: string;
  description: string;
};

export type EvaluacionFormErrors = Partial<
  Record<"order" | "percentage" | "description", string>
>;
