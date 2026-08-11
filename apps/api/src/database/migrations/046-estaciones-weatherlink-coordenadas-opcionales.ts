import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const ESTACIONES_WEATHERLINK_COORDENADAS_OPCIONALES_MIGRATION: DatabaseMigration =
  {
    id: "046-estaciones-weatherlink-coordenadas-opcionales",
    description: "Permite registrar estaciones WeatherLink sin coordenadas GPS.",
    sql: `
    ALTER TABLE clima.estaciones_meteorologicas
      ALTER COLUMN latitud DROP NOT NULL,
      ALTER COLUMN longitud DROP NOT NULL;

    -- Rollback: completar latitud y longitud de todas las estaciones antes de
    -- restaurar NOT NULL. Los checks de rango existentes permanecen vigentes.
  `
  };
