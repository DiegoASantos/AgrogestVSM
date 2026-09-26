import { z } from "zod";

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const harvestRecordSchema = z
  .object({
    productorId: z.string().min(1),
    creditorId: z.string().min(1),
    crateQuantity: z.number().int().positive(),
    cratePrice: z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/),
    registrationDate: calendarDateSchema,
    harvestDate: calendarDateSchema
  })
  .superRefine((value, context) => {
    if (Number(value.cratePrice) <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cratePrice"],
        message: "El precio de jaba debe ser mayor que cero."
      });
    }

    if (!isCalendarDate(value.registrationDate) || !isCalendarDate(value.harvestDate)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["harvestDate"],
        message: "Ingresa una fecha valida."
      });
    } else if (value.harvestDate > value.registrationDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["harvestDate"],
        message: "La fecha de cosecha no puede ser posterior a la fecha actual."
      });
    }
  });

export type HarvestRecordInput = z.infer<typeof harvestRecordSchema>;

function isCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
