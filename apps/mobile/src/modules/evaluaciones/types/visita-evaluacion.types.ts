import type { OrganoAfectado } from "../../observaciones-sanitarias/types";

export type VisitaEvaluacion = {
  id: string;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  visitaId: string;
  order: number;
  incidencePercentage: string | null;
  percentage: string | null;
  description: string;
  organosAfectados: OrganoAfectado[];
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
