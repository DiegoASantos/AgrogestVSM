export type ParcelaClimate = {
  parcelaId: string;
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
  climate: ParcelaClimate;
  isCached: boolean;
  isStale: boolean;
};
