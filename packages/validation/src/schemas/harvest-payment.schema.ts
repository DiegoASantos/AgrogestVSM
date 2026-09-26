import { z } from "zod";

export const creditorDocumentTypes = ["DNI", "RUC"] as const;
export const harvestPaymentBanks = ["INTERBANK", "BCP", "CAJA_PIURA", "BBVA"] as const;

export const harvestPaymentSchema = z
  .object({
    productorId: z.string().min(1),
    creditorFirstName: z.string().trim().min(1).max(100),
    creditorLastName: z.string().trim().min(1).max(100),
    creditorDocumentType: z.enum(creditorDocumentTypes).default("DNI"),
    creditorDocumentNumber: z.string().regex(/^\d+$/),
    bank: z.enum(harvestPaymentBanks),
    accountNumber: z.string().regex(/^\d{1,30}$/)
  })
  .superRefine((value, context) => {
    const length = value.creditorDocumentType === "DNI" ? 8 : 11;
    if (value.creditorDocumentNumber.length !== length)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["creditorDocumentNumber"],
        message: `El ${value.creditorDocumentType} debe tener ${length} digitos.`
      });
  });
export type HarvestPaymentInput = z.infer<typeof harvestPaymentSchema>;
