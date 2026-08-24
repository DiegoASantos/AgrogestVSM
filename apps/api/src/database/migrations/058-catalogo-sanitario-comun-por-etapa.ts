import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const CATALOGO_SANITARIO_COMUN_POR_ETAPA_MIGRATION: DatabaseMigration = {
  id: "058-catalogo-sanitario-comun-por-etapa",
  description:
    "Clasifica el catálogo sanitario de Mango como común u opcional por etapa y labor.",
  sql: `
    DO $$
    DECLARE
      mango_count integer;
      stage_count integer;
      target_pest_count integer;
      expected_relation_count integer;
      actual_relation_count integer;
    BEGIN
      SELECT count(*) INTO mango_count
        FROM cultivos
       WHERE activo = true AND lower(btrim(codigo)) = 'mng';
      IF mango_count <> 1 THEN
        RAISE EXCEPTION 'Se requiere exactamente un cultivo Mango activo con código MNG; encontrados %', mango_count;
      END IF;

      SELECT count(*) INTO stage_count
        FROM etapas_fenologicas etapa
        INNER JOIN cultivos cultivo ON cultivo.id = etapa.cultivo_id
       WHERE cultivo.activo = true
         AND lower(btrim(cultivo.codigo)) = 'mng'
         AND etapa.activo = true
         AND lower(btrim(etapa.tipo)) IN ('etapa', 'labor')
         AND lower(translate(btrim(etapa.nombre), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) IN (
           'poda', 'brotamiento', 'maduracion del brote', 'induccion floral',
           'floracion', 'amarre y cuajado', 'desarrollo de fruto', 'cosecha'
         );
      IF stage_count <> 8 THEN
        RAISE EXCEPTION 'Se requieren las ocho etapas/labores Mango configuradas; encontradas %', stage_count;
      END IF;

      SELECT count(*) INTO target_pest_count
        FROM plagas_enfermedades
       WHERE activo = true
         AND codigo IN (
           'trips', 'queresas', 'cochinilla', 'mosca_fruta', 'chinche', 'acaros',
           'aranita_roja', 'mosca_blanca', 'hormiga_arriera', 'gusano_barrenador',
           'oidium', 'alternaria', 'antracnosis', 'fumagina', 'muerte_regresiva',
           'fusariosis', 'botritis'
         );
      IF target_pest_count <> 17 THEN
        RAISE EXCEPTION 'Se requieren los 17 códigos sanitarios Mango activos; encontrados %', target_pest_count;
      END IF;

      SELECT count(*) INTO actual_relation_count
        FROM plagas_enfermedades_etapas_niveles relacion
        INNER JOIN plagas_enfermedades objetivo ON objetivo.id = relacion.plaga_enfermedad_id
        INNER JOIN etapas_fenologicas etapa ON etapa.id = relacion.etapa_fenologica_id
        INNER JOIN cultivos cultivo ON cultivo.id = etapa.cultivo_id
       WHERE objetivo.codigo IN (
           'trips', 'queresas', 'cochinilla', 'mosca_fruta', 'chinche', 'acaros',
           'aranita_roja', 'mosca_blanca', 'hormiga_arriera', 'gusano_barrenador',
           'oidium', 'alternaria', 'antracnosis', 'fumagina', 'muerte_regresiva',
           'fusariosis', 'botritis'
         )
         AND cultivo.activo = true AND lower(btrim(cultivo.codigo)) = 'mng'
         AND etapa.activo = true AND lower(btrim(etapa.tipo)) IN ('etapa', 'labor')
         AND lower(translate(btrim(etapa.nombre), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) IN (
           'poda', 'brotamiento', 'maduracion del brote', 'induccion floral',
           'floracion', 'amarre y cuajado', 'desarrollo de fruto', 'cosecha'
         );
      expected_relation_count := 17 * 8 * 8;
      IF actual_relation_count <> expected_relation_count THEN
        RAISE EXCEPTION 'El catálogo sanitario Mango debe tener % relaciones base; encontradas %', expected_relation_count, actual_relation_count;
      END IF;
    END $$;

    UPDATE plagas_enfermedades_etapas_niveles relacion
       SET activo = false
      FROM plagas_enfermedades objetivo,
           etapas_fenologicas etapa,
           cultivos cultivo
     WHERE objetivo.id = relacion.plaga_enfermedad_id
       AND etapa.id = relacion.etapa_fenologica_id
       AND cultivo.id = etapa.cultivo_id
       AND objetivo.activo = true
       AND lower(btrim(objetivo.tipo)) IN ('plaga', 'enfermedad')
       AND cultivo.activo = true AND lower(btrim(cultivo.codigo)) = 'mng'
       AND etapa.activo = true AND lower(btrim(etapa.tipo)) IN ('etapa', 'labor');

    WITH comunes(codigo, etapa) AS (
      VALUES
        ('queresas', NULL), ('cochinilla', NULL), ('fumagina', NULL), ('muerte_regresiva', NULL),
        ('trips', 'floracion'), ('trips', 'amarre y cuajado'),
        ('chinche', 'floracion'), ('chinche', 'amarre y cuajado'),
        ('acaros', 'floracion'), ('acaros', 'amarre y cuajado'),
        ('mosca_fruta', 'desarrollo de fruto'), ('mosca_fruta', 'cosecha'),
        ('mosca_blanca', 'desarrollo de fruto'), ('mosca_blanca', 'cosecha'),
        ('aranita_roja', 'brotamiento'), ('aranita_roja', 'maduracion del brote'),
        ('aranita_roja', 'induccion floral'), ('aranita_roja', 'floracion'),
        ('hormiga_arriera', 'brotamiento'), ('hormiga_arriera', 'maduracion del brote'),
        ('hormiga_arriera', 'induccion floral'), ('hormiga_arriera', 'floracion'),
        ('gusano_barrenador', 'floracion'), ('oidium', 'floracion'),
        ('alternaria', 'brotamiento'), ('alternaria', 'maduracion del brote'),
        ('alternaria', 'induccion floral'), ('alternaria', 'floracion'),
        ('alternaria', 'amarre y cuajado'), ('alternaria', 'desarrollo de fruto'),
        ('alternaria', 'cosecha'),
        ('antracnosis', 'desarrollo de fruto'), ('antracnosis', 'cosecha'),
        ('fusariosis', 'floracion'), ('botritis', 'floracion')
    )
    UPDATE plagas_enfermedades_etapas_niveles relacion
       SET activo = true
      FROM plagas_enfermedades objetivo,
           etapas_fenologicas etapa,
           cultivos cultivo,
           comunes
     WHERE objetivo.id = relacion.plaga_enfermedad_id
       AND etapa.id = relacion.etapa_fenologica_id
       AND cultivo.id = etapa.cultivo_id
       AND comunes.codigo = objetivo.codigo
       AND cultivo.activo = true AND lower(btrim(cultivo.codigo)) = 'mng'
       AND etapa.activo = true AND lower(btrim(etapa.tipo)) IN ('etapa', 'labor')
       AND (
         comunes.etapa IS NULL
         OR lower(translate(btrim(etapa.nombre), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) = comunes.etapa
       );

    -- Rollback operativo: conservar las relaciones y sus estados. Si se requiere
    -- restaurar otra clasificación, aplicar una migración correctiva basada en
    -- el backup validado previo al despliegue; no borrar observaciones históricas.
  `
};
