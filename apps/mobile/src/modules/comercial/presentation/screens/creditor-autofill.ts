import type { Productor } from "../../../productores/types";

export type CreditorAutofill = {
  firstName: string;
  lastName: string;
  documentType: "DNI" | "RUC";
  documentNumber: string;
};

export function getCreditorAutofill(
  productor: Productor | null,
  documentTypeCode: string | null
): CreditorAutofill | null {
  if (
    !productor ||
    productor.entityType !== "persona" ||
    !productor.firstName?.trim() ||
    !productor.lastName?.trim() ||
    !productor.documentNumber?.trim()
  ) {
    return null;
  }

  const documentType = documentTypeCode?.trim().toUpperCase();
  const documentNumber = productor.documentNumber.replace(/\s/g, "");

  if (documentType !== "DNI" && documentType !== "RUC") {
    return null;
  }

  const expectedLength = documentType === "DNI" ? 8 : 11;

  if (!new RegExp(`^\\d{${expectedLength}}$`).test(documentNumber)) {
    return null;
  }

  return {
    firstName: productor.firstName.trim(),
    lastName: productor.lastName.trim(),
    documentType,
    documentNumber
  };
}
