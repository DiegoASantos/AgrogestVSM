export const ORGANOS_AFECTADOS = [
  "tronco_rama",
  "yema_apical",
  "brote_vegetativo",
  "hoja",
  "panicula_floral",
  "flor_individual",
  "fruto_recien_cuajado",
  "fruto_verde",
  "fruto_maduro"
] as const;

export type OrganoAfectado = (typeof ORGANOS_AFECTADOS)[number];
