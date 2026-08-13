export const climateDistricts = [
  { code: "tambogrande", name: "Tambogrande" },
  { code: "las-lomas", name: "Las Lomas" },
  { code: "motupe", name: "Motupe" },
  { code: "casma", name: "Casma" }
] as const;

// TODO: replace with the district-to-climate-point catalog when it exists.
export type ClimateDistrictCode = (typeof climateDistricts)[number]["code"];

export type DistrictClimate = {
  district: {
    code: ClimateDistrictCode;
    name: string;
  };
  source: {
    type: "estimated_weather_model";
    provider: "Open-Meteo";
    modelSelection: "best_match";
    fetchedAt: string;
    expiresAt: string;
  };
  current: {
    observedAt: string;
    temperatureC: number | null;
    relativeHumidityPercent: number | null;
    precipitationMm: number | null;
    windSpeedKmh: number | null;
    weatherCode: number | null;
  };
  field: {
    rainfallLast24hMm: number | null;
    et0TodayMm: number | null;
    soilMoisture3To9cmM3M3: number | null;
  };
  forecast: Array<{
    date: string;
    temperatureMinC: number | null;
    temperatureMaxC: number | null;
    precipitationMm: number | null;
    precipitationProbabilityPercent: number | null;
    et0Mm: number | null;
    windSpeedMaxKmh: number | null;
    weatherCode: number | null;
  }>;
};

export type ClimateLoadResult = {
  climate: DistrictClimate;
  isCached: boolean;
  isStale: boolean;
};

export type WeatherLinkReading = {
  variable: string;
  value: number;
  unit: string;
  type: string;
  dataAt: string;
  receivedAt: string;
};

export type WeatherLinkStation = {
  id: string;
  name: string;
  code: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  variables: string[];
  lastCommunicationAt: string | null;
  isActive: boolean;
  source: string | null;
  sourceCode: string | null;
  syncStatus: string | null;
  lastCompleteDay: string | null;
  syncDetail: string | null;
  current: WeatherLinkReading[];
};

export type WeatherLinkStationsLoadResult = {
  stations: WeatherLinkStation[];
  isCached: boolean;
  isStale: boolean;
};
