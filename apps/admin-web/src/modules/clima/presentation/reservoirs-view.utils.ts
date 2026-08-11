import type { Reservoir } from "../services/clima.service";

export function reservoirFixedDetails(reservoir: Reservoir) {
  return [
    {
      label: "Capacidad máxima",
      value: fixedValue(reservoir.capacityMaxMmc, "MMC")
    },
    {
      label: "Cota máxima",
      value: fixedValue(reservoir.elevationMaxMasl, "msnm")
    },
    {
      label: "Coordenadas",
      value: `${reservoir.latitude.toFixed(6)}, ${reservoir.longitude.toFixed(6)}`
    }
  ];
}

export function toLocalDateTimeInput(value: Date) {
  const localValue = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return localValue.toISOString().slice(0, 16);
}

function fixedValue(value: number | null, unit: string) {
  return value === null ? "No configurada" : `${value.toLocaleString("es-PE")} ${unit}`;
}
