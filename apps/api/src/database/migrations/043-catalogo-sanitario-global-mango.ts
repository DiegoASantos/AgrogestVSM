import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const CATALOGO_SANITARIO_GLOBAL_MANGO_MIGRATION: DatabaseMigration = {
  id: "043-catalogo-sanitario-global-mango",
  description:
    "Completa plagas, enfermedades, incidencia y severidad en todas las etapas y labores de mango.",
  sql: `
    DO $$
    DECLARE
      mango_count integer;
      target_stage_count integer;
      active_pest_count integer;
      active_disease_count integer;
      canonical_level_count integer;
      duplicated_level_count integer;
    BEGIN
      SELECT count(*) INTO mango_count
      FROM cultivos
      WHERE activo = true
        AND lower(btrim(nombre)) = 'mango';

      IF mango_count <> 1 THEN
        RAISE EXCEPTION
          'El catálogo sanitario global requiere exactamente un cultivo mango activo; encontrados: %',
          mango_count;
      END IF;

      SELECT count(*) INTO target_stage_count
      FROM etapas_fenologicas etapa
      INNER JOIN cultivos cultivo ON cultivo.id = etapa.cultivo_id
      WHERE cultivo.activo = true
        AND lower(btrim(cultivo.nombre)) = 'mango'
        AND etapa.activo = true
        AND lower(btrim(etapa.tipo)) IN ('etapa', 'labor');

      IF target_stage_count = 0 THEN
        RAISE EXCEPTION
          'El catálogo sanitario global requiere al menos una etapa o labor activa de mango.';
      END IF;

      SELECT count(*) FILTER (WHERE lower(btrim(tipo)) = 'plaga'),
             count(*) FILTER (WHERE lower(btrim(tipo)) = 'enfermedad')
      INTO active_pest_count, active_disease_count
      FROM plagas_enfermedades
      WHERE activo = true
        AND lower(btrim(tipo)) IN ('plaga', 'enfermedad');

      IF active_pest_count = 0 OR active_disease_count = 0 THEN
        RAISE EXCEPTION
          'El catálogo sanitario global requiere plagas y enfermedades activas; plagas: %, enfermedades: %',
          active_pest_count,
          active_disease_count;
      END IF;

      SELECT count(*) INTO canonical_level_count
      FROM niveles_incidencia_severidad
      WHERE tipo IN ('incidencia', 'severidad')
        AND grado BETWEEN 0 AND 3;

      SELECT count(*) INTO duplicated_level_count
      FROM (
        SELECT tipo, grado
        FROM niveles_incidencia_severidad
        WHERE tipo IN ('incidencia', 'severidad')
          AND grado BETWEEN 0 AND 3
        GROUP BY tipo, grado
        HAVING count(*) <> 1
      ) duplicated_levels;

      IF canonical_level_count <> 8 OR duplicated_level_count <> 0 THEN
        RAISE EXCEPTION
          'El catálogo sanitario global requiere exactamente un nivel por tipo y grado 0..3; filas: %, combinaciones inválidas: %',
          canonical_level_count,
          duplicated_level_count;
      END IF;
    END
    $$;

    INSERT INTO plagas_enfermedades_etapas_niveles (
      plaga_enfermedad_id,
      etapa_fenologica_id,
      nivel_incidencia_severidad_id,
      descripcion,
      activo
    )
    SELECT
      plaga_enfermedad.id,
      etapa.id,
      nivel.id,
      NULL,
      true
    FROM plagas_enfermedades plaga_enfermedad
    CROSS JOIN etapas_fenologicas etapa
    INNER JOIN cultivos cultivo ON cultivo.id = etapa.cultivo_id
    CROSS JOIN niveles_incidencia_severidad nivel
    WHERE plaga_enfermedad.activo = true
      AND lower(btrim(plaga_enfermedad.tipo)) IN ('plaga', 'enfermedad')
      AND cultivo.activo = true
      AND lower(btrim(cultivo.nombre)) = 'mango'
      AND etapa.activo = true
      AND lower(btrim(etapa.tipo)) IN ('etapa', 'labor')
      AND nivel.tipo IN ('incidencia', 'severidad')
      AND nivel.grado BETWEEN 0 AND 3
    ON CONFLICT (
      plaga_enfermedad_id,
      etapa_fenologica_id,
      nivel_incidencia_severidad_id
    ) DO UPDATE
    SET activo = true;

    DO $$
    DECLARE
      expected_relation_count bigint;
      actual_relation_count bigint;
    BEGIN
      SELECT
        (
          SELECT count(*)
          FROM plagas_enfermedades
          WHERE activo = true
            AND lower(btrim(tipo)) IN ('plaga', 'enfermedad')
        )
        *
        (
          SELECT count(*)
          FROM etapas_fenologicas etapa
          INNER JOIN cultivos cultivo ON cultivo.id = etapa.cultivo_id
          WHERE cultivo.activo = true
            AND lower(btrim(cultivo.nombre)) = 'mango'
            AND etapa.activo = true
            AND lower(btrim(etapa.tipo)) IN ('etapa', 'labor')
        )
        * 8
      INTO expected_relation_count;

      SELECT count(*) INTO actual_relation_count
      FROM plagas_enfermedades_etapas_niveles relacion
      INNER JOIN plagas_enfermedades plaga_enfermedad
        ON plaga_enfermedad.id = relacion.plaga_enfermedad_id
      INNER JOIN etapas_fenologicas etapa
        ON etapa.id = relacion.etapa_fenologica_id
      INNER JOIN cultivos cultivo
        ON cultivo.id = etapa.cultivo_id
      INNER JOIN niveles_incidencia_severidad nivel
        ON nivel.id = relacion.nivel_incidencia_severidad_id
      WHERE relacion.activo = true
        AND plaga_enfermedad.activo = true
        AND lower(btrim(plaga_enfermedad.tipo)) IN ('plaga', 'enfermedad')
        AND cultivo.activo = true
        AND lower(btrim(cultivo.nombre)) = 'mango'
        AND etapa.activo = true
        AND lower(btrim(etapa.tipo)) IN ('etapa', 'labor')
        AND nivel.tipo IN ('incidencia', 'severidad')
        AND nivel.grado BETWEEN 0 AND 3;

      IF actual_relation_count <> expected_relation_count THEN
        RAISE EXCEPTION
          'La carga sanitaria global quedó incompleta; relaciones esperadas: %, encontradas: %',
          expected_relation_count,
          actual_relation_count;
      END IF;
    END
    $$;

    -- Rollback operativo: conservar la carga aditiva al revertir código. Si la
    -- configuración fuera incorrecta, restaurar el subconjunto de relaciones
    -- desde la instantánea previa mediante una migración correctiva auditada.
  `
};
