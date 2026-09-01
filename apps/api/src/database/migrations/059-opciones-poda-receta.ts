import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const OPCIONES_PODA_RECETA_MIGRATION: DatabaseMigration = {
  id: "059-opciones-poda-receta",
  description: "Amplia las labores recomendadas de receta con cuatro tipos de poda.",
  sql: `
    ALTER TABLE visita_receta_labores
      DROP CONSTRAINT IF EXISTS visita_receta_labores_labor_check,
      DROP CONSTRAINT IF EXISTS ck_visita_receta_labores_labor;

    ALTER TABLE visita_receta_labores
      ADD CONSTRAINT ck_visita_receta_labores_labor CHECK (labor IN (
        'limpieza_maleza_pala',
        'limpieza_maleza_motoguadana',
        'horqueteo',
        'enzunchado',
        'recoleccion_frutos',
        'trampas_mosca',
        'poda_formacion',
        'poda_saneamiento',
        'poda_aclareo_iluminacion',
        'poda_rejuvenecimiento_severa'
      ));

    -- Rollback operativo: no restaurar el constraint anterior si existen recetas
    -- con podas nuevas. Mantener la expansion y aplicar una correccion hacia
    -- adelante para preservar compatibilidad con dispositivos offline.
  `
};
