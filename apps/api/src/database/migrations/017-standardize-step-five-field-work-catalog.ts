import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const STANDARDIZE_STEP_FIVE_FIELD_WORK_CATALOG_MIGRATION: DatabaseMigration = {
  id: "017-standardize-step-five-field-work-catalog",
  description:
    "Standardizes step five field work catalog options and removes obsolete local visit dependencies.",
  sql: `
    DELETE FROM visitas_campo
    WHERE id IN (
      SELECT vr.visita_id
      FROM visita_riegos vr
      INNER JOIN tipos_riego tr ON tr.id = vr.tipo_riego_id
      WHERE lower(tr.nombre) IN (
        lower('Riego por inundacion pesado'),
        lower('Riego por inundación pesado')
      )
      UNION
      SELECT vlc.visita_id
      FROM visita_labores_culturales vlc
      INNER JOIN labores_culturales lc ON lc.id = vlc.labor_cultural_id
      WHERE lower(lc.nombre) = lower('Ruptura de Agoste')
    );

    DELETE FROM tipos_riego
    WHERE lower(nombre) IN (
      lower('Riego por inundacion pesado'),
      lower('Riego por inundación pesado')
    );

    DELETE FROM labores_culturales
    WHERE lower(nombre) = lower('Ruptura de Agoste');

    ALTER TABLE labores_culturales
      ADD COLUMN IF NOT EXISTS categoria_codigo varchar(80),
      ADD COLUMN IF NOT EXISTS categoria_nombre varchar(120),
      ADD COLUMN IF NOT EXISTS opcion_codigo varchar(80),
      ADD COLUMN IF NOT EXISTS opcion_etiqueta varchar(120),
      ADD COLUMN IF NOT EXISTS leyenda text,
      ADD COLUMN IF NOT EXISTS orden integer;

    INSERT INTO labores_culturales (
      nombre,
      descripcion,
      categoria_codigo,
      categoria_nombre,
      opcion_codigo,
      opcion_etiqueta,
      leyenda,
      orden,
      activo
    )
    VALUES
      ('Nivel de infestación de maleza - Limpio', 'Sin maleza', 'weed_infestation', 'Nivel de infestación de maleza', 'clean', 'Limpio', 'Sin maleza', 10, true),
      ('Nivel de infestación de maleza - Bajo', 'Maleza interfila', 'weed_infestation', 'Nivel de infestación de maleza', 'low', 'Bajo', 'Maleza interfila', 20, true),
      ('Nivel de infestación de maleza - Alto', 'Maleza afecta la línea de goteo', 'weed_infestation', 'Nivel de infestación de maleza', 'high', 'Alto', 'Maleza afecta la línea de goteo', 30, true),
      ('Estado sanitario del suelo - Limpio', 'sin fruta caída', 'soil_sanitary_status', 'Estado sanitario del suelo', 'clean', 'Limpio', 'sin fruta caída', 110, true),
      ('Estado sanitario del suelo - Leve', 'Fruta de raleo natural', 'soil_sanitary_status', 'Estado sanitario del suelo', 'mild', 'Leve', 'Fruta de raleo natural', 120, true),
      ('Estado sanitario del suelo - Crítico', 'Fruta podrida/plagas', 'soil_sanitary_status', 'Estado sanitario del suelo', 'critical', 'Crítico', 'Fruta podrida/plagas', 130, true),
      ('Densidad de ramas improductivas - Bajo', NULL, 'unproductive_branch_density', 'Densidad de ramas improductivas', 'low', 'Bajo', NULL, 210, true),
      ('Densidad de ramas improductivas - Moderado', NULL, 'unproductive_branch_density', 'Densidad de ramas improductivas', 'moderate', 'Moderado', NULL, 220, true),
      ('Densidad de ramas improductivas - Alto', 'Requiere poda', 'unproductive_branch_density', 'Densidad de ramas improductivas', 'high', 'Alto', 'Requiere poda', 230, true),
      ('Riesgo de quiebre de cargadores - Bajo', 'Carga óptima', 'branch_break_risk', 'Riesgo de quiebre de cargadores', 'low', 'Bajo', 'Carga óptima', 310, true),
      ('Riesgo de quiebre de cargadores - Crítico', 'Riesgo de rotura de ramas', 'branch_break_risk', 'Riesgo de quiebre de cargadores', 'critical', 'Crítico', 'Riesgo de rotura de ramas', 320, true),
      ('Estado de la Copa - Buena', 'Entra luz al centro', 'canopy_status', 'Estado de la Copa', 'good', 'Buena', 'Entra luz al centro', 410, true),
      ('Estado de la Copa - Sombreada', 'Copa densa o "emboscada"', 'canopy_status', 'Estado de la Copa', 'shaded', 'Sombreada', 'Copa densa o "emboscada"', 420, true),
      ('Balance de Carga - Escaso', 'Temporada de poco volumen y fruta grande', 'load_balance', 'Balance de Carga', 'low_volume', 'Escaso', 'Temporada de poco volumen y fruta grande', 510, true),
      ('Balance de Carga - Equilibrado', NULL, 'load_balance', 'Balance de Carga', 'balanced', 'Equilibrado', NULL, 520, true),
      ('Balance de Carga - Excesivo', 'Temporada mucho volumen y bajo calibre', 'load_balance', 'Balance de Carga', 'excessive', 'Excesivo', 'Temporada mucho volumen y bajo calibre', 530, true)
    ON CONFLICT ON CONSTRAINT labores_culturales_nombre_key
    DO UPDATE SET
      descripcion = EXCLUDED.descripcion,
      categoria_codigo = EXCLUDED.categoria_codigo,
      categoria_nombre = EXCLUDED.categoria_nombre,
      opcion_codigo = EXCLUDED.opcion_codigo,
      opcion_etiqueta = EXCLUDED.opcion_etiqueta,
      leyenda = EXCLUDED.leyenda,
      orden = EXCLUDED.orden,
      activo = true,
      actualizado_at = now();
  `
};
