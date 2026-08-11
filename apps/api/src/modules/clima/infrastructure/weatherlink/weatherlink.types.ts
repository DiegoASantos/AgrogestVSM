export type WeatherLinkConfig = {
  enabled: boolean;
  apiKey: string;
  apiSecret: string;
  dailySyncHour: number;
  timeZone: string;
  catchupMaxDays: number;
  requestTimeoutMs: number;
};

export type WeatherLinkStation = {
  station_id?: number;
  station_id_uuid?: string;
  station_name?: string;
  latitude?: number | string;
  longitude?: number | string;
  elevation?: number | string;
};

export type WeatherLinkSensor = {
  lsid?: number;
  sensor_type?: number;
  data_structure_type?: number;
  data?: Array<Record<string, unknown>>;
};

export type WeatherLinkHistoricPayload = {
  station_id?: number;
  sensors?: WeatherLinkSensor[];
  generated_at?: number;
};

export type NormalizedWeatherLinkReading = {
  variable: string;
  value: number;
  unit: string;
  dataAt: string;
};
