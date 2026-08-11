export const RESERVOIR_VARIABLE_UNITS = {
  cota_msnm: "msnm",
  volumen_mmc: "MMC",
  caudal_entrada_m3s: "m3/s",
  caudal_salida_m3s: "m3/s",
  evaporacion_mm: "mm"
} as const;

export const RESERVOIR_VARIABLES = Object.keys(
  RESERVOIR_VARIABLE_UNITS
) as ReservoirVariable[];

export const RESERVOIR_READING_TYPES = ["OBSERVADO", "ESTIMADO"] as const;

export type ReservoirVariable = keyof typeof RESERVOIR_VARIABLE_UNITS;
export type ReservoirReadingType = (typeof RESERVOIR_READING_TYPES)[number];
