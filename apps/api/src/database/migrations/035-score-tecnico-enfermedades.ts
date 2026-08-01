import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const SCORE_TECNICO_ENFERMEDADES_MIGRATION: DatabaseMigration = {
  id: "035-score-tecnico-enfermedades",
  description: "Adds stable catalog codes for the four diseases in the technical score.",
  sql: `
    UPDATE plagas_enfermedades
    SET codigo = CASE lower(trim(nombre))
      WHEN 'oidium' THEN 'oidium'
      WHEN 'oidio' THEN 'oidium'
      WHEN 'oídio' THEN 'oidium'
      WHEN 'antracnosis' THEN 'antracnosis'
      WHEN 'muerte regresiva' THEN 'muerte_regresiva'
      WHEN 'alternaria' THEN 'alternaria'
      ELSE codigo
    END
    WHERE codigo IS NULL
      AND lower(trim(tipo)) = 'enfermedad'
      AND lower(trim(nombre)) IN (
        'oidium',
        'oidio',
        'oídio',
        'antracnosis',
        'muerte regresiva',
        'alternaria'
      );

    DO $$
    DECLARE
      disease_code text;
      catalog_count integer;
    BEGIN
      FOREACH disease_code IN ARRAY ARRAY[
        'oidium',
        'antracnosis',
        'muerte_regresiva',
        'alternaria'
      ]
      LOOP
        SELECT count(*) INTO catalog_count
        FROM plagas_enfermedades
        WHERE lower(trim(tipo)) = 'enfermedad'
          AND codigo = disease_code;

        IF catalog_count <> 1 THEN
          RAISE EXCEPTION
            'El catálogo técnico requiere exactamente una enfermedad con código %; encontrados: %',
            disease_code,
            catalog_count;
        END IF;
      END LOOP;
    END $$;

    -- Rollback operativo: conservar los codigos estables porque son aditivos y
    -- pueden ser consumidos por clientes desplegados. Revertir la API/UI sin
    -- borrar datos ni observaciones pendientes.
  `
};
