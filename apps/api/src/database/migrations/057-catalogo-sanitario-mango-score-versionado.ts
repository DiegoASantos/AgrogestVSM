import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const CATALOGO_SANITARIO_MANGO_SCORE_VERSIONADO_MIGRATION: DatabaseMigration = {
  id: "057-catalogo-sanitario-mango-score-versionado",
  description:
    "Agrega catálogo sanitario Mango y versiona el score técnico para preservar históricos.",
  sql: `
    ALTER TABLE visitas_campo
      ADD COLUMN IF NOT EXISTS version_score_tecnico smallint;
    UPDATE visitas_campo
       SET version_score_tecnico = 1
     WHERE version_score_tecnico IS NULL;
    ALTER TABLE visitas_campo
      ALTER COLUMN version_score_tecnico SET DEFAULT 2,
      ALTER COLUMN version_score_tecnico SET NOT NULL;
    ALTER TABLE visitas_campo
      DROP CONSTRAINT IF EXISTS chk_visitas_campo_version_score_tecnico;
    ALTER TABLE visitas_campo
      ADD CONSTRAINT chk_visitas_campo_version_score_tecnico
      CHECK (version_score_tecnico IN (1, 2));

    DO $$
    DECLARE
      target record;
      matches integer;
    BEGIN
      FOR target IN
        SELECT * FROM (VALUES
          ('aranita_roja'::varchar, 'Arañita roja'::varchar, 'plaga'::varchar),
          ('mosca_blanca'::varchar, 'Mosca blanca'::varchar, 'plaga'::varchar),
          ('gusano_barrenador'::varchar, 'Gusano barrenador'::varchar, 'plaga'::varchar),
          ('hormiga_arriera'::varchar, 'Hormiga arriera'::varchar, 'plaga'::varchar),
          ('fusariosis'::varchar, 'Fusariosis'::varchar, 'enfermedad'::varchar),
          ('botritis'::varchar, 'Botritis'::varchar, 'enfermedad'::varchar),
          ('fumagina'::varchar, 'Fumagina'::varchar, 'enfermedad'::varchar)
        ) AS targets(codigo, nombre, tipo)
      LOOP
        SELECT count(*) INTO matches
          FROM plagas_enfermedades
         WHERE codigo = target.codigo
            OR (lower(btrim(nombre)) = lower(target.nombre)
                AND lower(btrim(tipo)) = target.tipo);
        IF matches > 1 THEN
          RAISE EXCEPTION 'Catálogo sanitario ambiguo para %: % filas', target.nombre, matches;
        END IF;
        IF matches = 1 THEN
          UPDATE plagas_enfermedades
             SET codigo = target.codigo, nombre = target.nombre, tipo = target.tipo,
                 activo = true
           WHERE codigo = target.codigo
              OR (lower(btrim(nombre)) = lower(target.nombre)
                  AND lower(btrim(tipo)) = target.tipo);
        ELSE
          INSERT INTO plagas_enfermedades (nombre, codigo, tipo, activo)
          VALUES (target.nombre, target.codigo, target.tipo, true);
        END IF;
      END LOOP;
    END $$;

    INSERT INTO plagas_enfermedades_etapas_niveles (
      plaga_enfermedad_id, etapa_fenologica_id, nivel_incidencia_severidad_id,
      descripcion, activo
    )
    SELECT pest.id, etapa.id, nivel.id, NULL, true
      FROM plagas_enfermedades pest
      CROSS JOIN etapas_fenologicas etapa
      INNER JOIN cultivos cultivo ON cultivo.id = etapa.cultivo_id
      CROSS JOIN niveles_incidencia_severidad nivel
     WHERE pest.codigo IN (
       'aranita_roja', 'mosca_blanca', 'gusano_barrenador', 'hormiga_arriera',
       'fusariosis', 'botritis', 'fumagina'
     )
       AND pest.activo = true
       AND cultivo.activo = true AND lower(btrim(cultivo.codigo)) = 'mng'
       AND etapa.activo = true AND lower(btrim(etapa.tipo)) IN ('etapa', 'labor')
       AND nivel.tipo IN ('incidencia', 'severidad') AND nivel.grado BETWEEN 0 AND 3
    ON CONFLICT (plaga_enfermedad_id, etapa_fenologica_id, nivel_incidencia_severidad_id)
    DO UPDATE SET activo = true;

    -- Rollback operativo: conservar versiones y catálogo aditivos. Una corrección
    -- posterior puede desactivar elementos, sin borrar observaciones referenciadas.
  `
};
