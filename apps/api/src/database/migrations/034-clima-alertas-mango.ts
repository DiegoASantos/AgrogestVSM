import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const CLIMA_ALERTAS_MANGO_MIGRATION: DatabaseMigration = {
  id: "034-clima-alertas-mango",
  description: "Agrega umbrales de alerta climatica especificos para cultivo de mango.",
  sql: `
    INSERT INTO clima.umbrales_alerta(codigo, variable, operador, valor_precaucion, valor_alta, valor_critica, unidad) VALUES
      ('calor_floracion',     'temperature_2m_max', '>=', 36, 38, 41, '°C'),
      ('frio_induccion',      'temperature_2m_min', '<=', 14, 11,  8, '°C'),
      ('vpd_estres',          'vapour_pressure_deficit', '>=', 2.0, 2.5, 3.5, 'kPa'),
      ('viento_danio',        'wind_gusts_10m_max', '>=', 40, 55, 70, 'km/h'),
      ('viento_floracion',    'wind_speed_10m_max', '>=', 30, 40, 55, 'km/h'),
      ('lluvia_floracion',    'precipitation_sum',  '>=',  5, 15, 30, 'mm'),
      ('lluvia_cosecha',      'precipitation_sum',  '>=',  3, 10, 20, 'mm'),
      ('horas_sol_bajas',     'sunshine_duration',  '<=',  4, 2.5, 1.5, 'h')
    ON CONFLICT(codigo) DO NOTHING;
  `
};
