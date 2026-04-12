import { z } from "zod";

export const fieldVisitStatuses = ["pendiente", "en_progreso", "completada"] as const;

export const fieldVisitSchema = z.object({
  productorId: z.string().min(1, "El productor es obligatorio."),
  parcelaId: z.string().min(1, "La parcela es obligatoria."),
  tecnicoId: z.string().min(1, "El tecnico es obligatorio."),
  fechaProgramada: z.string().min(1, "La fecha programada es obligatoria."),
  estado: z.enum(fieldVisitStatuses).default("pendiente"),
  observaciones: z
    .string()
    .trim()
    .max(500, "Las observaciones no deben exceder 500 caracteres.")
    .optional()
});

export type FieldVisitInput = z.infer<typeof fieldVisitSchema>;
