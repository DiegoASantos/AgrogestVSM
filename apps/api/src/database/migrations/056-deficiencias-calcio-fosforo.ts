import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const DEFICIENCIAS_CALCIO_FOSFORO_MIGRATION: DatabaseMigration = {
  id: "056-deficiencias-calcio-fosforo",
  description:
    "Agrega Calcio y Fósforo al catálogo nutricional de Mango con las severidades de Nitrógeno.",
  sql: `
    DO $$
    DECLARE
      mango_id bigint;
      nitrogeno_id bigint;
      mango_count integer;
      nitrogeno_count integer;
      template_detail_count integer;
      target_match_count integer;
      target record;
    BEGIN
      SELECT count(*), min(id)
        INTO mango_count, mango_id
      FROM cultivos
      WHERE activo = true
        AND lower(btrim(codigo)) = 'mango';

      IF mango_count <> 1 THEN
        RAISE EXCEPTION
          'La carga de Calcio y Fósforo requiere exactamente un cultivo Mango activo; encontrados: %',
          mango_count;
      END IF;

      SELECT count(*), min(id)
        INTO nitrogeno_count, nitrogeno_id
      FROM nutrientes
      WHERE cultivo_id = mango_id
        AND activo = true
        AND codigo = 'nitrogeno';

      IF nitrogeno_count <> 1 THEN
        RAISE EXCEPTION
          'La carga de Calcio y Fósforo requiere exactamente un Nitrógeno activo de Mango; encontrados: %',
          nitrogeno_count;
      END IF;

      SELECT count(*) INTO template_detail_count
      FROM detalle_nutrientes
      WHERE nutriente_id = nitrogeno_id
        AND activo = true;

      IF template_detail_count = 0 THEN
        RAISE EXCEPTION
          'La carga de Calcio y Fósforo requiere severidades activas para Nitrógeno.';
      END IF;

      FOR target IN
        SELECT *
        FROM (VALUES
          ('calcio'::varchar, 'Calcio'::varchar),
          ('fosforo'::varchar, 'Fósforo'::varchar)
        ) AS targets(codigo, nombre)
      LOOP
        SELECT count(*) INTO target_match_count
        FROM nutrientes
        WHERE cultivo_id = mango_id
          AND (
            codigo = target.codigo
            OR translate(lower(btrim(nombre)), 'áéíóúüñ', 'aeiouun') = target.codigo
          );

        IF target_match_count > 1 THEN
          RAISE EXCEPTION
            'El nutriente % de Mango es ambiguo; filas encontradas: %',
            target.nombre,
            target_match_count;
        END IF;

        IF target_match_count = 1 THEN
          UPDATE nutrientes
          SET codigo = target.codigo,
              nombre = target.nombre,
              activo = true,
              actualizado_at = now()
          WHERE cultivo_id = mango_id
            AND (
              codigo = target.codigo
              OR translate(lower(btrim(nombre)), 'áéíóúüñ', 'aeiouun') = target.codigo
            );
        ELSE
          INSERT INTO nutrientes (
            cultivo_id,
            codigo,
            nombre,
            descripcion,
            activo
          )
          VALUES (
            mango_id,
            target.codigo,
            target.nombre,
            'Deficiencia nutricional de ' || target.nombre || ' en mango.',
            true
          );
        END IF;
      END LOOP;
    END
    $$;

    INSERT INTO detalle_nutrientes (
      nutriente_id,
      nombre,
      descripcion,
      activo
    )
    SELECT
      target.id,
      template.nombre,
      template.descripcion,
      true
    FROM nutrientes target
    INNER JOIN cultivos cultivo
      ON cultivo.id = target.cultivo_id
    INNER JOIN nutrientes nitrogeno
      ON nitrogeno.cultivo_id = cultivo.id
     AND nitrogeno.codigo = 'nitrogeno'
     AND nitrogeno.activo = true
    INNER JOIN detalle_nutrientes template
      ON template.nutriente_id = nitrogeno.id
     AND template.activo = true
    WHERE cultivo.activo = true
      AND lower(btrim(cultivo.codigo)) = 'mango'
      AND target.codigo IN ('calcio', 'fosforo')
    ON CONFLICT ON CONSTRAINT detalle_nutrientes_nutriente_nombre_key
    DO UPDATE SET
      descripcion = EXCLUDED.descripcion,
      activo = true,
      actualizado_at = now();

    UPDATE detalle_nutrientes target_detail
    SET activo = false,
        actualizado_at = now()
    FROM nutrientes target,
         cultivos cultivo,
         nutrientes nitrogeno
    WHERE target_detail.nutriente_id = target.id
      AND target.cultivo_id = cultivo.id
      AND nitrogeno.cultivo_id = cultivo.id
      AND nitrogeno.codigo = 'nitrogeno'
      AND nitrogeno.activo = true
      AND cultivo.activo = true
      AND lower(btrim(cultivo.codigo)) = 'mango'
      AND target.codigo IN ('calcio', 'fosforo')
      AND target_detail.activo = true
      AND NOT EXISTS (
        SELECT 1
        FROM detalle_nutrientes template
        WHERE template.nutriente_id = nitrogeno.id
          AND template.activo = true
          AND template.nombre = target_detail.nombre
      );

    DO $$
    DECLARE
      mango_id bigint;
      template_detail_count integer;
      target_count integer;
      incomplete_target_count integer;
    BEGIN
      SELECT id INTO STRICT mango_id
      FROM cultivos
      WHERE activo = true
        AND lower(btrim(codigo)) = 'mango';

      SELECT count(*) INTO template_detail_count
      FROM detalle_nutrientes detail
      INNER JOIN nutrientes nutrient
        ON nutrient.id = detail.nutriente_id
      WHERE nutrient.cultivo_id = mango_id
        AND nutrient.codigo = 'nitrogeno'
        AND nutrient.activo = true
        AND detail.activo = true;

      SELECT count(*) INTO target_count
      FROM nutrientes
      WHERE cultivo_id = mango_id
        AND codigo IN ('calcio', 'fosforo')
        AND activo = true;

      SELECT count(*) INTO incomplete_target_count
      FROM nutrientes target
      WHERE target.cultivo_id = mango_id
        AND target.codigo IN ('calcio', 'fosforo')
        AND target.activo = true
        AND (
          SELECT count(*)
          FROM detalle_nutrientes detail
          WHERE detail.nutriente_id = target.id
            AND detail.activo = true
        ) <> template_detail_count;

      IF target_count <> 2 OR incomplete_target_count <> 0 THEN
        RAISE EXCEPTION
          'La carga de Calcio y Fósforo quedó incompleta; nutrientes: %, incompletos: %',
          target_count,
          incomplete_target_count;
      END IF;
    END
    $$;

    -- Rollback operativo: no eliminar nutrientes ni severidades porque pueden
    -- estar referenciados por evaluaciones o dispositivos offline. Aplicar una
    -- baja lógica o migración correctiva auditada si fuera necesario.
  `
};
