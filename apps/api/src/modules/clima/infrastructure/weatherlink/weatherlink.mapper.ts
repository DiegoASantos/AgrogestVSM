import type {
  NormalizedWeatherLinkReading,
  WeatherLinkHistoricPayload
} from "./weatherlink.types";

type Mapping = { variable: string; unit: string; convert?: (value: number) => number };

const fahrenheitToCelsius = (value: number) => round((value - 32) * (5 / 9));
const mphToKmh = (value: number) => round(value * 1.609344);
const inchesToMm = (value: number) => round(value * 25.4);
const inHgToHpa = (value: number) => round(value * 33.8638866667);
const identity = (value: number) => value;

const FIELD_MAPPINGS: Record<string, Mapping> = {
  temp_out: { variable: "temperature_2m", unit: "°C", convert: fahrenheitToCelsius },
  temp_last: { variable: "temperature_2m", unit: "°C", convert: fahrenheitToCelsius },
  hum_out: { variable: "relative_humidity_2m", unit: "%" },
  hum: { variable: "relative_humidity_2m", unit: "%" },
  dew_point: { variable: "dew_point_2m", unit: "°C", convert: fahrenheitToCelsius },
  wind_speed_avg: { variable: "wind_speed_10m", unit: "km/h", convert: mphToKmh },
  wind_speed_last: { variable: "wind_speed_10m", unit: "km/h", convert: mphToKmh },
  wind_speed_hi: { variable: "wind_gusts_10m", unit: "km/h", convert: mphToKmh },
  wind_dir_of_prevail: { variable: "wind_direction_10m", unit: "°" },
  wind_dir_last: { variable: "wind_direction_10m", unit: "°" },
  rainfall_in: { variable: "precipitation", unit: "mm", convert: inchesToMm },
  rain_rate_hi_in: { variable: "precipitation_rate", unit: "mm/h", convert: inchesToMm },
  bar_sea_level: { variable: "surface_pressure", unit: "hPa", convert: inHgToHpa },
  bar_absolute: { variable: "surface_pressure", unit: "hPa", convert: inHgToHpa },
  solar_rad_avg: { variable: "shortwave_radiation", unit: "W/m2" },
  solar_rad: { variable: "shortwave_radiation", unit: "W/m2" },
  uv_index_avg: { variable: "uv_index", unit: "index" },
  uv_index: { variable: "uv_index", unit: "index" },
  et: { variable: "et0_fao_evapotranspiration", unit: "mm", convert: inchesToMm }
};

export function normalizeWeatherLinkPayload(
  payload: WeatherLinkHistoricPayload
): NormalizedWeatherLinkReading[] {
  const readings: NormalizedWeatherLinkReading[] = [];
  const seen = new Set<string>();

  for (const sensor of payload.sensors ?? []) {
    for (const record of sensor.data ?? []) {
      const timestamp = number(record.ts);
      if (timestamp === null) continue;
      for (const [field, raw] of Object.entries(record)) {
        const mapping = FIELD_MAPPINGS[field] ?? dynamicMapping(field);
        const value = number(raw);
        if (!mapping || value === null) continue;
        const normalized = (mapping.convert ?? identity)(value);
        if (!Number.isFinite(normalized)) continue;
        const key = `${mapping.variable}:${timestamp}`;
        if (seen.has(key)) continue;
        seen.add(key);
        readings.push({
          variable: mapping.variable,
          value: normalized,
          unit: mapping.unit,
          dataAt: new Date(timestamp * 1000).toISOString()
        });
      }
    }
  }

  return readings;
}

function dynamicMapping(field: string): Mapping | null {
  const soilTemperature = field.match(/^temp_soil_(\d+)$/u);
  if (soilTemperature) {
    return {
      variable: `soil_temperature_${soilTemperature[1]}`,
      unit: "°C",
      convert: fahrenheitToCelsius
    };
  }
  const soilMoisture = field.match(/^moist_soil_(\d+)$/u);
  if (soilMoisture) {
    return { variable: `soil_moisture_${soilMoisture[1]}_cb`, unit: "cb" };
  }
  const leafWetness = field.match(/^wet_leaf_(\d+)$/u);
  if (leafWetness) {
    return { variable: `leaf_wetness_${leafWetness[1]}`, unit: "index" };
  }
  return null;
}

function number(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
