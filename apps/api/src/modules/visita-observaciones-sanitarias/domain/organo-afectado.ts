export const ORGANOS_AFECTADOS = ["hoja", "tallo", "flores", "fruto"] as const;

export type OrganoAfectado = (typeof ORGANOS_AFECTADOS)[number];
