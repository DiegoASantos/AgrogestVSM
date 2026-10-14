export type PersonaComparable = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  documentTypeId: number | null;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
};

export function normalizeIdentityText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function candidateReasons(a: PersonaComparable, b: PersonaComparable): string[] {
  if (a.id === b.id) return [];
  const reasons: string[] = [];
  if (
    a.documentTypeId && b.documentTypeId &&
    a.documentTypeId === b.documentTypeId &&
    a.documentNumber && b.documentNumber &&
    normalizeIdentityText(a.documentNumber) === normalizeIdentityText(b.documentNumber)
  ) reasons.push("DOCUMENTO");

  const fullA = new Set(normalizeIdentityText(`${a.firstName ?? ""} ${a.lastName ?? ""}`).split(" ").filter(Boolean));
  const fullB = new Set(normalizeIdentityText(`${b.firstName ?? ""} ${b.lastName ?? ""}`).split(" ").filter(Boolean));
  const common = [...fullA].filter((token) => token.length >= 3 && fullB.has(token));
  const firstA = normalizeIdentityText(a.firstName).split(" ")[0];
  const firstB = normalizeIdentityText(b.firstName).split(" ")[0];
  const lastA = normalizeIdentityText(a.lastName).split(" ")[0];
  const lastB = normalizeIdentityText(b.lastName).split(" ")[0];

  if (common.length >= 2 && (firstA === firstB || lastA === lastB)) {
    reasons.push("NOMBRE");
  }
  if (
    firstA && firstA === firstB && a.phone && b.phone &&
    a.phone.replace(/\D/g, "") === b.phone.replace(/\D/g, "")
  ) reasons.push("TELEFONO");
  if (
    a.email && b.email && a.email.trim().toLowerCase() === b.email.trim().toLowerCase()
  ) reasons.push("EMAIL");
  return reasons;
}
