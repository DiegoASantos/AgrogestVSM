import type { Productor } from "../../../productores/types";

export type CreditorAutofill = {
  firstName: string | null;
  lastName: string | null;
  documentType: "DNI" | "RUC" | null;
  documentNumber: string | null;
};

export type CreditorPendingField =
  | "firstName"
  | "lastName"
  | "documentType"
  | "documentNumber";

export function getCreditorAutofill(
  productor: Productor | null,
  documentTypeCode: string | null
): CreditorAutofill | null {
  if (
    !productor ||
    productor.entityType !== "persona"
  ) {
    return null;
  }

  const documentType = documentTypeCode?.trim().toUpperCase();
  const normalizedDocumentType =
    documentType === "DNI" || documentType === "RUC" ? documentType : null;
  const documentNumber = productor.documentNumber?.replace(/\s/g, "") ?? "";
  const expectedLength = normalizedDocumentType === "DNI" ? 8 : 11;
  const hasValidDocument =
    normalizedDocumentType !== null &&
    new RegExp(`^\\d{${expectedLength}}$`).test(documentNumber);

  return {
    firstName: productor.firstName?.trim() || null,
    lastName: productor.lastName?.trim() || null,
    documentType: normalizedDocumentType,
    documentNumber: hasValidDocument ? documentNumber : null
  };
}

export function getPendingCreditorFields(
  autofill: CreditorAutofill | null
): CreditorPendingField[] {
  if (!autofill) {
    return ["firstName", "lastName", "documentType", "documentNumber"];
  }

  return [
    !autofill.firstName ? "firstName" : null,
    !autofill.lastName ? "lastName" : null,
    !autofill.documentType ? "documentType" : null,
    !autofill.documentNumber ? "documentNumber" : null
  ].filter((field): field is CreditorPendingField => field !== null);
}
