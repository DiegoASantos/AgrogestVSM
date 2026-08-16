import { type SQLiteDatabase } from "expo-sqlite";

import { SQL_SCHEMA } from "./schema";

type Migration = {
  version: number;
  statements?: readonly string[];
  run?: (db: SQLiteDatabase) => void;
};

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: SQL_SCHEMA
  },
  {
    version: 2,
    statements: [
      "ALTER TABLE visitas_campo ADD COLUMN sync_error_message TEXT",
      "ALTER TABLE visita_evaluaciones ADD COLUMN sync_error_message TEXT",
      "ALTER TABLE visita_observaciones_sanitarias ADD COLUMN sync_error_message TEXT",
      "CREATE INDEX idx_visitas_campo_sync ON visitas_campo(sync_status)",
      "CREATE INDEX idx_evaluaciones_sync ON visita_evaluaciones(sync_status)",
      "CREATE INDEX idx_obs_sanitarias_sync ON visita_observaciones_sanitarias(sync_status)",
      "CREATE INDEX idx_evaluaciones_visita ON visita_evaluaciones(visita_local_id)",
      "CREATE INDEX idx_obs_sanitarias_visita ON visita_observaciones_sanitarias(visita_local_id)"
    ]
  },
  {
    version: 3,
    statements: [
      `CREATE TABLE IF NOT EXISTS sync_outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_local_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
        created_at TEXT NOT NULL
      )`
    ]
  },
  {
    version: 4,
    statements: ["ALTER TABLE sync_outbox ADD COLUMN payload TEXT"]
  },
  {
    version: 5,
    statements: [
      "ALTER TABLE sync_outbox ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0"
    ]
  },
  {
    version: 6,
    statements: [
      "CREATE INDEX IF NOT EXISTS idx_sync_outbox_entity ON sync_outbox(entity_type, entity_local_id)"
    ]
  },
  {
    version: 7,
    run: (db) => {
      addColumnIfMissing(db, "productores", "first_name", "TEXT");
      addColumnIfMissing(db, "productores", "last_name", "TEXT");
    }
  },
  {
    version: 8,
    statements: [
      "CREATE INDEX IF NOT EXISTS idx_visitas_campo_agronomist_recent ON visitas_campo(agronomist_user_id, created_at DESC)"
    ]
  },
  {
    version: 9,
    statements: [
      "DELETE FROM sync_outbox",
      "DELETE FROM visita_evaluaciones",
      "DELETE FROM visita_observaciones_sanitarias",
      "DELETE FROM visitas_campo",
      "DROP TABLE IF EXISTS parcelas",
      "DROP TABLE IF EXISTS subsectores",
      "DROP TABLE IF EXISTS sectores",
      ...SQL_SCHEMA.filter((statement) =>
        [
          "CREATE TABLE IF NOT EXISTS departamentos",
          "CREATE TABLE IF NOT EXISTS provincias",
          "CREATE TABLE IF NOT EXISTS distritos",
          "CREATE TABLE IF NOT EXISTS sectores",
          "CREATE TABLE IF NOT EXISTS subsectores",
          "CREATE TABLE IF NOT EXISTS parcelas"
        ].some((prefix) => statement.startsWith(prefix))
      ),
      "CREATE INDEX IF NOT EXISTS idx_parcelas_productor_id ON parcelas(productor_id)",
      "CREATE INDEX IF NOT EXISTS idx_subsectores_sector_id ON subsectores(sector_id)",
      "CREATE INDEX IF NOT EXISTS idx_parcelas_productor_subsector ON parcelas(productor_id, subsector_id)"
    ]
  },
  {
    version: 10,
    run: (db) => {
      addColumnIfMissing(db, "etapas_fenologicas", "sort_order", "INTEGER");
      addColumnIfMissing(
        db,
        "etapas_fenologicas",
        "type",
        "TEXT NOT NULL DEFAULT 'Etapa'"
      );
    }
  },
  {
    version: 11,
    run: (db) => {
      db.execSync(
        `CREATE TABLE IF NOT EXISTS sub_etapas (
          id TEXT PRIMARY KEY NOT NULL,
          etapa_fenologica_id TEXT NOT NULL,
          name TEXT NOT NULL,
          sort_order INTEGER NOT NULL,
          description TEXT,
          percentage TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY (etapa_fenologica_id) REFERENCES etapas_fenologicas(id)
        )`
      );
      addColumnIfMissing(db, "visitas_campo", "area_hectares", "TEXT");
      addColumnIfMissing(db, "visitas_campo", "sub_etapa_id", "TEXT");
      addColumnIfMissing(db, "visitas_campo", "sub_etapa_percentage", "TEXT");
      db.execSync(
        "CREATE INDEX IF NOT EXISTS idx_sub_etapas_etapa ON sub_etapas(etapa_fenologica_id)"
      );
    }
  },
  {
    version: 12,
    run: (db) => {
      addColumnIfMissing(db, "pest_diseases", "scientific_name", "TEXT");
      dropColumnIfExists(db, "pest_diseases", "code");
    }
  },
  {
    version: 13,
    run: (db) => {
      addColumnIfMissing(
        db,
        "incidence_levels",
        "type",
        "TEXT NOT NULL DEFAULT 'incidencia'"
      );
    }
  },
  {
    version: 14,
    run: (db) => {
      addColumnIfMissing(db, "pest_diseases", "phenological_stage_id", "TEXT");
    }
  },
  {
    version: 15,
    run: (db) => {
      addColumnIfMissing(
        db,
        "visita_observaciones_sanitarias",
        "severity_level_id",
        "TEXT"
      );
      db.execSync(
        `CREATE TABLE IF NOT EXISTS pest_disease_stage_levels (
          id TEXT PRIMARY KEY NOT NULL,
          pest_disease_id TEXT NOT NULL,
          phenological_stage_id TEXT NOT NULL,
          incidence_severity_level_id TEXT NOT NULL,
          description TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          FOREIGN KEY (pest_disease_id) REFERENCES pest_diseases(id),
          FOREIGN KEY (phenological_stage_id) REFERENCES etapas_fenologicas(id),
          FOREIGN KEY (incidence_severity_level_id) REFERENCES incidence_levels(id)
        )`
      );
      db.execSync(
        `CREATE TABLE IF NOT EXISTS visita_paso_observaciones (
          local_id TEXT PRIMARY KEY NOT NULL,
          server_id TEXT,
          visita_local_id TEXT NOT NULL,
          step_number INTEGER NOT NULL,
          observation TEXT,
          recommendation TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
          sync_error_message TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (visita_local_id) REFERENCES visitas_campo(local_id) ON DELETE CASCADE,
          UNIQUE (visita_local_id, step_number)
        )`
      );
      addColumnIfMissing(db, "visita_paso_observaciones", "sync_error_message", "TEXT");
      db.execSync(
        "CREATE INDEX IF NOT EXISTS idx_pest_disease_stage_levels_stage ON pest_disease_stage_levels(phenological_stage_id)"
      );
      db.execSync(
        "CREATE INDEX IF NOT EXISTS idx_pest_disease_stage_levels_pest ON pest_disease_stage_levels(pest_disease_id)"
      );
      db.execSync(
        "CREATE INDEX IF NOT EXISTS idx_visita_paso_observaciones_visita ON visita_paso_observaciones(visita_local_id)"
      );
    }
  },
  {
    version: 16,
    statements: ["DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'"]
  },
  {
    version: 17,
    statements: [
      "DELETE FROM sync_outbox WHERE entity_type IN ('visita_recomendaciones', 'visita_productos_recomendados')",
      "DROP TABLE IF EXISTS visita_productos_recomendados",
      "DROP TABLE IF EXISTS visita_recomendaciones",
      "DROP TABLE IF EXISTS application_frequencies",
      "DROP TABLE IF EXISTS products",
      "DROP TABLE IF EXISTS recommendation_types"
    ]
  },
  {
    version: 18,
    statements: [
      `CREATE TABLE IF NOT EXISTS tipos_riego (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS labores_culturales (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS visita_riegos (
        local_id TEXT PRIMARY KEY NOT NULL,
        server_id TEXT,
        visita_local_id TEXT NOT NULL,
        tipo_riego_id TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
        sync_error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (visita_local_id) REFERENCES visitas_campo(local_id) ON DELETE CASCADE,
        FOREIGN KEY (tipo_riego_id) REFERENCES tipos_riego(id),
        UNIQUE (visita_local_id)
      )`,
      `CREATE TABLE IF NOT EXISTS visita_labores_culturales (
        local_id TEXT PRIMARY KEY NOT NULL,
        server_id TEXT,
        visita_local_id TEXT NOT NULL,
        labor_cultural_id TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
        sync_error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (visita_local_id) REFERENCES visitas_campo(local_id) ON DELETE CASCADE,
        FOREIGN KEY (labor_cultural_id) REFERENCES labores_culturales(id),
        UNIQUE (visita_local_id, labor_cultural_id)
      )`,
      "CREATE INDEX IF NOT EXISTS idx_visita_riegos_visita ON visita_riegos(visita_local_id)",
      "CREATE INDEX IF NOT EXISTS idx_visita_labores_culturales_visita ON visita_labores_culturales(visita_local_id)",
      "DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'"
    ]
  },
  {
    version: 19,
    statements: [
      `CREATE TABLE IF NOT EXISTS visita_observacion_sanitaria_organos (
        local_id TEXT PRIMARY KEY NOT NULL,
        visita_observacion_sanitaria_local_id TEXT NOT NULL,
        organo TEXT NOT NULL CHECK(organo IN ('tronco_rama', 'yema_apical', 'brote_vegetativo', 'hoja', 'panicula_floral', 'flor_individual', 'fruto_recien_cuajado', 'fruto_verde', 'fruto_maduro')),
        created_at TEXT NOT NULL,
        FOREIGN KEY (visita_observacion_sanitaria_local_id) REFERENCES visita_observaciones_sanitarias(local_id) ON DELETE CASCADE,
        UNIQUE (visita_observacion_sanitaria_local_id, organo)
      )`,
      "CREATE INDEX IF NOT EXISTS idx_visita_obs_sanitaria_organos_observacion ON visita_observacion_sanitaria_organos(visita_observacion_sanitaria_local_id)"
    ]
  },
  {
    version: 20,
    statements: [
      `CREATE TABLE IF NOT EXISTS nutrientes (
        id TEXT PRIMARY KEY NOT NULL,
        cultivo_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (cultivo_id) REFERENCES cultivos(id)
      )`,
      `CREATE TABLE IF NOT EXISTS detalle_nutrientes (
        id TEXT PRIMARY KEY NOT NULL,
        nutriente_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (nutriente_id) REFERENCES nutrientes(id)
      )`,
      "CREATE INDEX IF NOT EXISTS idx_nutrientes_cultivo ON nutrientes(cultivo_id)",
      "CREATE INDEX IF NOT EXISTS idx_detalle_nutrientes_nutriente ON detalle_nutrientes(nutriente_id)",
      "DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'"
    ]
  },
  {
    version: 21,
    run: (db) => {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS visita_observacion_sanitaria_organos_next (
          local_id TEXT PRIMARY KEY NOT NULL,
          visita_observacion_sanitaria_local_id TEXT NOT NULL,
          organo TEXT NOT NULL CHECK(organo IN ('tronco_rama', 'yema_apical', 'brote_vegetativo', 'hoja', 'panicula_floral', 'flor_individual', 'fruto_recien_cuajado', 'fruto_verde', 'fruto_maduro')),
          created_at TEXT NOT NULL,
          FOREIGN KEY (visita_observacion_sanitaria_local_id) REFERENCES visita_observaciones_sanitarias(local_id) ON DELETE CASCADE,
          UNIQUE (visita_observacion_sanitaria_local_id, organo)
        )
      `);
      db.execSync(`
        INSERT OR IGNORE INTO visita_observacion_sanitaria_organos_next (
          local_id,
          visita_observacion_sanitaria_local_id,
          organo,
          created_at
        )
        SELECT
          local_id,
          visita_observacion_sanitaria_local_id,
          CASE organo
            WHEN 'tallo' THEN 'tronco_rama'
            WHEN 'flores' THEN 'flor_individual'
            WHEN 'fruto' THEN 'fruto_verde'
            ELSE organo
          END,
          created_at
        FROM visita_observacion_sanitaria_organos
        WHERE organo IN ('hoja', 'tallo', 'flores', 'fruto', 'tronco_rama', 'yema_apical', 'brote_vegetativo', 'panicula_floral', 'flor_individual', 'fruto_recien_cuajado', 'fruto_verde', 'fruto_maduro')
      `);
      db.execSync("DROP TABLE visita_observacion_sanitaria_organos");
      db.execSync(
        "ALTER TABLE visita_observacion_sanitaria_organos_next RENAME TO visita_observacion_sanitaria_organos"
      );
      db.execSync(
        "CREATE INDEX IF NOT EXISTS idx_visita_obs_sanitaria_organos_observacion ON visita_observacion_sanitaria_organos(visita_observacion_sanitaria_local_id)"
      );
    }
  },
  {
    version: 22,
    run: (db) => {
      addColumnIfMissing(
        db,
        "visita_riegos",
        "fuente_agua",
        "TEXT DEFAULT NULL CHECK(fuente_agua IS NULL OR fuente_agua IN ('subterranea', 'superficial'))"
      );
      addColumnIfMissing(
        db,
        "visita_riegos",
        "tipo_suelo",
        "TEXT DEFAULT NULL CHECK(tipo_suelo IS NULL OR tipo_suelo IN ('arenoso', 'arcilloso', 'limoso', 'franco'))"
      );
      addColumnIfMissing(
        db,
        "visita_riegos",
        "humedad_suelo",
        "TEXT DEFAULT NULL CHECK(humedad_suelo IS NULL OR humedad_suelo IN ('saturado', 'optimo', 'moderadamente_seco', 'seco'))"
      );
      addColumnIfMissing(
        db,
        "visita_riegos",
        "estres_hidrico",
        "INTEGER DEFAULT NULL CHECK(estres_hidrico IS NULL OR estres_hidrico IN (0, 1))"
      );
    }
  },
  {
    version: 23,
    run: (db) => {
      db.execSync("DELETE FROM detalle_nutrientes WHERE name LIKE '%Grado 0%'");
      db.execSync("DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'");
    }
  },
  {
    version: 24,
    run: (db) => {
      db.execSync("DROP TABLE IF EXISTS visita_observacion_sanitaria_organos_next");
      db.execSync(`
        CREATE TABLE visita_observacion_sanitaria_organos_next (
          local_id TEXT PRIMARY KEY NOT NULL,
          visita_observacion_sanitaria_local_id TEXT NOT NULL,
          organo TEXT NOT NULL CHECK(organo IN ('tronco_rama', 'yema_apical', 'brote_vegetativo', 'hoja_tierna', 'hoja_madura', 'panicula_floral', 'flor_individual', 'fruto_recien_cuajado', 'fruto_verde', 'fruto_maduro', 'raices')),
          created_at TEXT NOT NULL,
          FOREIGN KEY (visita_observacion_sanitaria_local_id) REFERENCES visita_observaciones_sanitarias(local_id) ON DELETE CASCADE,
          UNIQUE (visita_observacion_sanitaria_local_id, organo)
        )
      `);
      db.execSync(`
        INSERT OR IGNORE INTO visita_observacion_sanitaria_organos_next (
          local_id,
          visita_observacion_sanitaria_local_id,
          organo,
          created_at
        )
        SELECT
          local_id,
          visita_observacion_sanitaria_local_id,
          CASE organo
            WHEN 'tallo' THEN 'tronco_rama'
            WHEN 'flores' THEN 'flor_individual'
            WHEN 'fruto' THEN 'fruto_verde'
            WHEN 'hoja' THEN 'hoja_tierna'
            ELSE organo
          END,
          created_at
        FROM visita_observacion_sanitaria_organos
        WHERE organo IN ('hoja', 'tallo', 'flores', 'fruto', 'tronco_rama', 'yema_apical', 'brote_vegetativo', 'hoja_tierna', 'hoja_madura', 'panicula_floral', 'flor_individual', 'fruto_recien_cuajado', 'fruto_verde', 'fruto_maduro', 'raices')
      `);
      db.execSync("DROP TABLE visita_observacion_sanitaria_organos");
      db.execSync(
        "ALTER TABLE visita_observacion_sanitaria_organos_next RENAME TO visita_observacion_sanitaria_organos"
      );
      db.execSync(
        "CREATE INDEX IF NOT EXISTS idx_visita_obs_sanitaria_organos_observacion ON visita_observacion_sanitaria_organos(visita_observacion_sanitaria_local_id)"
      );
    }
  },
  {
    version: 25,
    run: (db) => {
      db.execSync(`
        DELETE FROM sync_outbox
        WHERE entity_local_id IN (
          SELECT local_id FROM visitas_campo
          WHERE local_id IN (
            SELECT visita_local_id
            FROM visita_riegos
            WHERE tipo_riego_id IN (
              SELECT id
              FROM tipos_riego
              WHERE name COLLATE NOCASE IN (
                'Riego por inundacion pesado',
                'Riego por inundación pesado'
              )
            )
            UNION
            SELECT visita_local_id
            FROM visita_labores_culturales
            WHERE labor_cultural_id IN (
              SELECT id
              FROM labores_culturales
              WHERE name COLLATE NOCASE = 'Ruptura de Agoste'
            )
          )
          UNION
          SELECT local_id FROM visita_evaluaciones
          WHERE visita_local_id IN (
            SELECT visita_local_id FROM visita_riegos
            WHERE tipo_riego_id IN (
              SELECT id FROM tipos_riego
              WHERE name COLLATE NOCASE IN (
                'Riego por inundacion pesado',
                'Riego por inundación pesado'
              )
            )
            UNION
            SELECT visita_local_id FROM visita_labores_culturales
            WHERE labor_cultural_id IN (
              SELECT id FROM labores_culturales
              WHERE name COLLATE NOCASE = 'Ruptura de Agoste'
            )
          )
          UNION
          SELECT local_id FROM visita_observaciones_sanitarias
          WHERE visita_local_id IN (
            SELECT visita_local_id FROM visita_riegos
            WHERE tipo_riego_id IN (
              SELECT id FROM tipos_riego
              WHERE name COLLATE NOCASE IN (
                'Riego por inundacion pesado',
                'Riego por inundación pesado'
              )
            )
            UNION
            SELECT visita_local_id FROM visita_labores_culturales
            WHERE labor_cultural_id IN (
              SELECT id FROM labores_culturales
              WHERE name COLLATE NOCASE = 'Ruptura de Agoste'
            )
          )
          UNION
          SELECT local_id FROM visita_paso_observaciones
          WHERE visita_local_id IN (
            SELECT visita_local_id FROM visita_riegos
            WHERE tipo_riego_id IN (
              SELECT id FROM tipos_riego
              WHERE name COLLATE NOCASE IN (
                'Riego por inundacion pesado',
                'Riego por inundación pesado'
              )
            )
            UNION
            SELECT visita_local_id FROM visita_labores_culturales
            WHERE labor_cultural_id IN (
              SELECT id FROM labores_culturales
              WHERE name COLLATE NOCASE = 'Ruptura de Agoste'
            )
          )
          UNION
          SELECT local_id FROM visita_riegos
          WHERE visita_local_id IN (
            SELECT visita_local_id FROM visita_riegos
            WHERE tipo_riego_id IN (
              SELECT id FROM tipos_riego
              WHERE name COLLATE NOCASE IN (
                'Riego por inundacion pesado',
                'Riego por inundación pesado'
              )
            )
            UNION
            SELECT visita_local_id FROM visita_labores_culturales
            WHERE labor_cultural_id IN (
              SELECT id FROM labores_culturales
              WHERE name COLLATE NOCASE = 'Ruptura de Agoste'
            )
          )
          UNION
          SELECT local_id FROM visita_labores_culturales
          WHERE visita_local_id IN (
            SELECT visita_local_id FROM visita_riegos
            WHERE tipo_riego_id IN (
              SELECT id FROM tipos_riego
              WHERE name COLLATE NOCASE IN (
                'Riego por inundacion pesado',
                'Riego por inundación pesado'
              )
            )
            UNION
            SELECT visita_local_id FROM visita_labores_culturales
            WHERE labor_cultural_id IN (
              SELECT id FROM labores_culturales
              WHERE name COLLATE NOCASE = 'Ruptura de Agoste'
            )
          )
        )
      `);
      db.execSync(`
        DELETE FROM visitas_campo
        WHERE local_id IN (
          SELECT visita_local_id
          FROM visita_riegos
          WHERE tipo_riego_id IN (
            SELECT id
            FROM tipos_riego
            WHERE name COLLATE NOCASE IN (
              'Riego por inundacion pesado',
              'Riego por inundación pesado'
            )
          )
          UNION
          SELECT visita_local_id
          FROM visita_labores_culturales
          WHERE labor_cultural_id IN (
            SELECT id
            FROM labores_culturales
            WHERE name COLLATE NOCASE = 'Ruptura de Agoste'
          )
        )
      `);
      db.execSync(`
        DELETE FROM tipos_riego
        WHERE name COLLATE NOCASE IN (
          'Riego por inundacion pesado',
          'Riego por inundación pesado'
        )
      `);
      db.execSync(`
        DELETE FROM labores_culturales
        WHERE name COLLATE NOCASE = 'Ruptura de Agoste'
      `);
      addColumnIfMissing(db, "labores_culturales", "category_code", "TEXT");
      addColumnIfMissing(db, "labores_culturales", "category_name", "TEXT");
      addColumnIfMissing(db, "labores_culturales", "option_code", "TEXT");
      addColumnIfMissing(db, "labores_culturales", "option_label", "TEXT");
      addColumnIfMissing(db, "labores_culturales", "legend", "TEXT");
      addColumnIfMissing(db, "labores_culturales", "sort_order", "INTEGER");
      db.execSync("DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'");
    }
  },
  {
    version: 26,
    run: (db) => {
      db.execSync(`
        DELETE FROM sync_outbox
        WHERE entity_local_id IN (
          SELECT local_id FROM visitas_campo
          WHERE local_id IN (
            SELECT visita_local_id
            FROM visita_riegos
            WHERE tipo_riego_id IN (
              SELECT id
              FROM tipos_riego
              WHERE name COLLATE NOCASE = 'Ruptura de Agoste'
            )
          )
          UNION
          SELECT local_id FROM visita_evaluaciones
          WHERE visita_local_id IN (
            SELECT visita_local_id
            FROM visita_riegos
            WHERE tipo_riego_id IN (
              SELECT id
              FROM tipos_riego
              WHERE name COLLATE NOCASE = 'Ruptura de Agoste'
            )
          )
          UNION
          SELECT local_id FROM visita_observaciones_sanitarias
          WHERE visita_local_id IN (
            SELECT visita_local_id
            FROM visita_riegos
            WHERE tipo_riego_id IN (
              SELECT id
              FROM tipos_riego
              WHERE name COLLATE NOCASE = 'Ruptura de Agoste'
            )
          )
          UNION
          SELECT local_id FROM visita_paso_observaciones
          WHERE visita_local_id IN (
            SELECT visita_local_id
            FROM visita_riegos
            WHERE tipo_riego_id IN (
              SELECT id
              FROM tipos_riego
              WHERE name COLLATE NOCASE = 'Ruptura de Agoste'
            )
          )
          UNION
          SELECT local_id FROM visita_riegos
          WHERE visita_local_id IN (
            SELECT visita_local_id
            FROM visita_riegos
            WHERE tipo_riego_id IN (
              SELECT id
              FROM tipos_riego
              WHERE name COLLATE NOCASE = 'Ruptura de Agoste'
            )
          )
          UNION
          SELECT local_id FROM visita_labores_culturales
          WHERE visita_local_id IN (
            SELECT visita_local_id
            FROM visita_riegos
            WHERE tipo_riego_id IN (
              SELECT id
              FROM tipos_riego
              WHERE name COLLATE NOCASE = 'Ruptura de Agoste'
            )
          )
        )
      `);
      db.execSync(`
        DELETE FROM visitas_campo
        WHERE local_id IN (
          SELECT visita_local_id
          FROM visita_riegos
          WHERE tipo_riego_id IN (
            SELECT id
            FROM tipos_riego
            WHERE name COLLATE NOCASE = 'Ruptura de Agoste'
          )
        )
      `);
      db.execSync(`
        DELETE FROM tipos_riego
        WHERE name COLLATE NOCASE = 'Ruptura de Agoste'
      `);
      db.execSync("DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'");
    }
  },
  {
    version: 27,
    run: (db) => {
      addColumnIfMissing(
        db,
        "visita_observaciones_sanitarias",
        "incidence_percentage",
        "TEXT DEFAULT NULL"
      );
      addColumnIfMissing(
        db,
        "visita_evaluaciones",
        "incidence_percentage",
        "TEXT DEFAULT NULL"
      );
      addColumnIfMissing(
        db,
        "visita_evaluaciones",
        "organos_afectados",
        "TEXT DEFAULT NULL"
      );
    }
  },
  {
    version: 28,
    statements: [
      `CREATE TABLE IF NOT EXISTS coadyuvantes (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS ingredientes_activos (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS marcas_producto (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        ingrediente_activo_id TEXT,
        concentracion TEXT,
        ingrediente_activo_nombre TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS modos_accion (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS tipos_control (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS tipos_producto_fitosanitario (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS fertilizantes (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('solido', 'liquido'))
      )`,
      `CREATE TABLE IF NOT EXISTS visita_recetas (
        local_id TEXT PRIMARY KEY NOT NULL,
        server_id TEXT,
        visita_local_id TEXT NOT NULL,
        etapa_fenologica TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
        sync_error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (visita_local_id) REFERENCES visitas_campo(local_id) ON DELETE CASCADE,
        UNIQUE (visita_local_id)
      )`,
      `CREATE TABLE IF NOT EXISTS visita_receta_fitosanidad (
        local_id TEXT PRIMARY KEY NOT NULL,
        server_id TEXT,
        receta_local_id TEXT NOT NULL,
        numero INTEGER NOT NULL DEFAULT 1,
        objetivo TEXT NOT NULL CHECK(objetivo IN ('plaga', 'enfermedad')),
        objetivo_nombre TEXT NOT NULL,
        tipo_control_id TEXT,
        tipo_producto_id TEXT,
        disolvente TEXT NOT NULL DEFAULT 'Agua',
        modo_accion_id TEXT,
        ingrediente_activo_nombre TEXT,
        dosis_ia TEXT,
        volumen_aplicacion TEXT,
        cantidad_total_ia TEXT,
        marca_producto_nombre TEXT,
        concentracion_producto TEXT,
        cantidad_total_producto TEXT,
        coadyuvantes_ids TEXT,
        orden_mezcla TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (receta_local_id) REFERENCES visita_recetas(local_id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS visita_receta_fertilizacion (
        local_id TEXT PRIMARY KEY NOT NULL,
        server_id TEXT,
        receta_local_id TEXT NOT NULL,
        via_aplicacion TEXT NOT NULL CHECK(via_aplicacion IN ('edafica', 'foliar')),
        fertilizante_nombre TEXT,
        tipo_producto TEXT CHECK(tipo_producto IN ('solido', 'liquido')),
        dosis TEXT,
        unidad_dosis TEXT,
        cantidad_total_plantas TEXT,
        volumen_aplicacion TEXT,
        cantidad_total_fertilizante TEXT,
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (receta_local_id) REFERENCES visita_recetas(local_id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS visita_receta_riego (
        local_id TEXT PRIMARY KEY NOT NULL,
        server_id TEXT,
        receta_local_id TEXT NOT NULL,
        tipo_recomendacion TEXT NOT NULL CHECK(tipo_recomendacion IN ('riego_pesado', 'riego_ligero', 'inicio_agoste', 'ruptura_agoste')),
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (receta_local_id) REFERENCES visita_recetas(local_id) ON DELETE CASCADE,
        UNIQUE (receta_local_id)
      )`,
      `CREATE TABLE IF NOT EXISTS visita_receta_labores (
        local_id TEXT PRIMARY KEY NOT NULL,
        server_id TEXT,
        receta_local_id TEXT NOT NULL,
        labor TEXT NOT NULL CHECK(labor IN ('limpieza_maleza_pala', 'limpieza_maleza_motoguadana', 'horqueteo', 'enzunchado', 'recoleccion_frutos', 'trampas_mosca')),
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (receta_local_id) REFERENCES visita_recetas(local_id) ON DELETE CASCADE,
        UNIQUE (receta_local_id, labor)
      )`,
      "CREATE INDEX IF NOT EXISTS idx_visita_recetas_visita ON visita_recetas(visita_local_id)",
      "CREATE INDEX IF NOT EXISTS idx_visita_receta_fitosanidad_receta ON visita_receta_fitosanidad(receta_local_id)",
      "CREATE INDEX IF NOT EXISTS idx_visita_receta_fertilizacion_receta ON visita_receta_fertilizacion(receta_local_id)",
      "CREATE INDEX IF NOT EXISTS idx_visita_receta_labores_receta ON visita_receta_labores(receta_local_id)",
      "DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'"
    ]
  },
  {
    version: 29,
    run(db: SQLiteDatabase) {
      addColumnIfMissing(db, "visita_recetas", "sync_error_message", "TEXT");
      addColumnIfMissing(db, "visita_receta_fitosanidad", "sync_error_message", "TEXT");
      addColumnIfMissing(db, "visita_receta_fertilizacion", "sync_error_message", "TEXT");
      addColumnIfMissing(db, "visita_receta_riego", "sync_error_message", "TEXT");
      addColumnIfMissing(db, "visita_receta_labores", "sync_error_message", "TEXT");
    }
  },
  {
    version: 30,
    run(db: SQLiteDatabase) {
      db.execSync(`
        UPDATE visita_observaciones_sanitarias
        SET sync_status = 'pending',
            sync_error_message = NULL
        WHERE sync_status = 'error'
          AND sync_error_message = 'Selected level is not available for the pest disease and visit phenological stage.'
      `);
      db.execSync(`
        UPDATE visita_riegos
        SET sync_status = 'pending',
            sync_error_message = NULL
        WHERE sync_status = 'error'
          AND sync_error_message LIKE '%Internal server error%'
      `);
    }
  },
  {
    version: 31,
    run(db: SQLiteDatabase) {
      db.execSync(`
        UPDATE visita_observaciones_sanitarias
        SET sync_status = 'pending',
            sync_error_message = NULL
        WHERE sync_status = 'error'
          AND sync_error_message = 'Selected level is not available for the pest disease and visit phenological stage.'
      `);
    }
  },
  {
    version: 32,
    run(db: SQLiteDatabase) {
      db.execSync(`
        UPDATE visita_observaciones_sanitarias
        SET sync_status = 'pending',
            sync_error_message = NULL
        WHERE sync_status = 'error'
          AND sync_error_message = 'Selected level is not available for the pest disease and visit phenological stage.'
      `);
    }
  },
  {
    version: 33,
    run(db: SQLiteDatabase) {
      addColumnIfMissing(
        db,
        "productores",
        "entity_type",
        "TEXT NOT NULL DEFAULT 'persona'"
      );
    }
  },
  {
    version: 34,
    run(db: SQLiteDatabase) {
      relaxProductoresDocumentColumns(db);
    }
  },
  {
    version: 35,
    run(db: SQLiteDatabase) {
      recreateSubsectoresAndParcelas(db);
    }
  },
  {
    version: 36,
    run(db: SQLiteDatabase) {
      addColumnIfMissing(db, "visitas_campo", "receta_anterior_json", "TEXT");
      db.execSync(`
        CREATE TABLE IF NOT EXISTS visita_calificaciones (
          local_id TEXT PRIMARY KEY NOT NULL,
          server_id TEXT,
          visita_local_id TEXT NOT NULL,
          modulo TEXT NOT NULL CHECK(modulo IN ('plagas','enfermedades','nutricion','riego','labores')),
          puntaje INTEGER NOT NULL CHECK(puntaje >= 0 AND puntaje <= 3),
          observacion TEXT,
          sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
          sync_error_message TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (visita_local_id) REFERENCES visitas_campo(local_id) ON DELETE CASCADE,
          UNIQUE (visita_local_id, modulo)
        )
      `);
      db.execSync(
        "CREATE INDEX IF NOT EXISTS idx_visita_calificaciones_visita ON visita_calificaciones(visita_local_id)"
      );
      db.execSync(
        "CREATE INDEX IF NOT EXISTS idx_visita_calificaciones_sync ON visita_calificaciones(sync_status)"
      );
    }
  },
  {
    version: 37,
    statements: [
      `CREATE TABLE IF NOT EXISTS sync_state (
        id TEXT PRIMARY KEY NOT NULL,
        window_json TEXT NOT NULL DEFAULT '[]',
        consecutive_failures INTEGER NOT NULL DEFAULT 0,
        consecutive_successes INTEGER NOT NULL DEFAULT 0,
        backoff_step INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TEXT,
        updated_at TEXT NOT NULL
      )`
    ]
  },
  {
    version: 38,
    run(db: SQLiteDatabase) {
      addColumnIfMissing(db, "visita_calificaciones", "justificado", "INTEGER");
      addColumnIfMissing(db, "visita_calificaciones", "categoria_justificacion", "TEXT");
      addColumnIfMissing(db, "visita_calificaciones", "motivo_justificacion", "TEXT");
    }
  },
  {
    version: 39,
    run(db: SQLiteDatabase) {
      addColumnIfMissing(db, "marcas_producto", "tipo_producto_id", "TEXT");
      db.execSync("DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'");
    }
  },
  {
    version: 40,
    statements: [
      `CREATE TABLE IF NOT EXISTS sync_failures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_local_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
        payload TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0 CHECK(retry_count >= 0),
        error_kind TEXT NOT NULL CHECK(error_kind IN ('transient', 'permanent')),
        error_message TEXT,
        outbox_created_at TEXT NOT NULL,
        last_attempt_at TEXT NOT NULL,
        failed_at TEXT NOT NULL,
        UNIQUE(entity_type, entity_local_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sync_failures_kind_failed_at
      ON sync_failures(error_kind, failed_at)`
    ]
  },
  {
    version: 41,
    run(db: SQLiteDatabase) {
      const rows = db.getAllSync<{
        local_id: string;
        visita_local_id: string;
        modulo: string;
        receta_anterior_json: string | null;
      }>(`
        SELECT c.local_id, c.visita_local_id, c.modulo, v.receta_anterior_json
        FROM visita_calificaciones c
        INNER JOIN visitas_campo v ON v.local_id = c.visita_local_id
        WHERE c.sync_status <> 'synced'
      `);

      for (const row of rows) {
        if (isLegacyPendingCalificacionEligible(row.receta_anterior_json, row.modulo))
          continue;
        db.runSync(
          "DELETE FROM sync_outbox WHERE entity_type = 'visita_calificaciones' AND entity_local_id = ?",
          row.local_id
        );
        db.runSync("DELETE FROM visita_calificaciones WHERE local_id = ?", row.local_id);
      }
    }
  },
  {
    version: 42,
    run(db: SQLiteDatabase) {
      addColumnIfMissing(db, "visita_paso_observaciones", "finalizado_at", "TEXT");
      db.execSync(
        "CREATE INDEX IF NOT EXISTS idx_obs_sanitarias_visita_plaga ON visita_observaciones_sanitarias(visita_local_id, pest_disease_id)"
      );
    }
  },
  {
    version: 43,
    statements: [
      `CREATE TABLE IF NOT EXISTS clima_parcela_cache (
        parcela_id TEXT PRIMARY KEY NOT NULL,
        payload_json TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (parcela_id) REFERENCES parcelas(id)
      )`
    ]
  },
  {
    version: 44,
    statements: [
      `CREATE TABLE IF NOT EXISTS clima_distrito_cache (
        distrito_codigo TEXT PRIMARY KEY NOT NULL,
        payload_json TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    ]
  },
  {
    version: 45,
    run(db: SQLiteDatabase) {
      addColumnIfMissing(db, "incidence_levels", "grade", "INTEGER");
      db.execSync(`
        WITH ranked_levels AS (
          SELECT
            id,
            CAST(
              ((ROW_NUMBER() OVER (PARTITION BY type ORDER BY sort_order, id) - 1) * 4.0)
              / COUNT(*) OVER (PARTITION BY type)
              AS INTEGER
            ) AS normalized_grade
          FROM incidence_levels
        )
        UPDATE incidence_levels
        SET grade = (
          SELECT normalized_grade
          FROM ranked_levels
          WHERE ranked_levels.id = incidence_levels.id
        )
      `);
      db.execSync("DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'");
    }
  },
  {
    version: 46,
    run(db: SQLiteDatabase) {
      addColumnIfMissing(db, "nutrientes", "code", "TEXT");
      addColumnIfMissing(
        db,
        "visita_evaluaciones",
        "nutrient_id",
        "TEXT REFERENCES nutrientes(id)"
      );
      db.execSync(`
        UPDATE nutrientes
        SET code = CASE lower(trim(name))
          WHEN 'nitrogeno' THEN 'nitrogeno'
          WHEN 'nitrógeno' THEN 'nitrogeno'
          WHEN 'magnesio' THEN 'magnesio'
          WHEN 'potasio' THEN 'potasio'
          WHEN 'hierro' THEN 'hierro'
          WHEN 'zinc' THEN 'zinc'
          WHEN 'boro' THEN 'boro'
          ELSE code
        END
        WHERE code IS NULL
      `);
      db.execSync(`
        UPDATE visita_evaluaciones AS evaluation
        SET nutrient_id = (
          SELECT nutrient.id
          FROM nutrientes AS nutrient
          INNER JOIN visitas_campo AS visit
            ON visit.local_id = evaluation.visita_local_id
          WHERE nutrient.cultivo_id = visit.crop_id
            AND lower(trim(nutrient.name)) = lower(trim(substr(
              evaluation.description,
              length('Nutricion -') + 1,
              instr(evaluation.description, ':') - length('Nutricion -') - 1
            )))
          LIMIT 1
        )
        WHERE evaluation.nutrient_id IS NULL
          AND evaluation.description LIKE 'Nutricion -%:%'
      `);
      db.execSync(`
        UPDATE visita_evaluaciones
        SET incidence_percentage = '0'
        WHERE nutrient_id IS NOT NULL
          AND incidence_percentage IS NULL
      `);
      db.execSync(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_nutrientes_cultivo_code ON nutrientes(cultivo_id, code) WHERE code IS NOT NULL"
      );
      db.execSync(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_visita_evaluaciones_nutriente ON visita_evaluaciones(visita_local_id, nutrient_id) WHERE nutrient_id IS NOT NULL"
      );
      db.execSync("DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'");
    }
  },
  {
    version: 47,
    statements: [
      "UPDATE visita_riegos SET fuente_agua = NULL WHERE fuente_agua = 'pluvial'"
    ]
  },
  {
    version: 48,
    run(db: SQLiteDatabase) {
      addColumnIfMissing(db, "pest_diseases", "code", "TEXT");
      db.execSync(`
        UPDATE pest_diseases
        SET code = CASE lower(trim(name))
          WHEN 'trips' THEN 'trips'
          WHEN 'thrips' THEN 'trips'
          WHEN 'queresa' THEN 'queresas'
          WHEN 'queresas' THEN 'queresas'
          WHEN 'acaro' THEN 'acaros'
          WHEN 'ácaro' THEN 'acaros'
          WHEN 'acaros' THEN 'acaros'
          WHEN 'ácaros' THEN 'acaros'
          WHEN 'cochinilla' THEN 'cochinilla'
          WHEN 'cochinillas' THEN 'cochinilla'
          WHEN 'chinche' THEN 'chinche'
          WHEN 'chinches' THEN 'chinche'
          WHEN 'mosca de la fruta' THEN 'mosca_fruta'
          WHEN 'mosca fruta' THEN 'mosca_fruta'
          WHEN 'oidium' THEN 'oidium'
          WHEN 'oidio' THEN 'oidium'
          WHEN 'oídio' THEN 'oidium'
          WHEN 'antracnosis' THEN 'antracnosis'
          WHEN 'muerte regresiva' THEN 'muerte_regresiva'
          WHEN 'alternaria' THEN 'alternaria'
          ELSE code
        END
        WHERE code IS NULL
      `);
      db.execSync("DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'");
    }
  },
  {
    version: 49,
    run(db: SQLiteDatabase) {
      addColumnIfMissing(db, "marcas_producto", "unidad_medida", "TEXT");
      addColumnIfMissing(db, "fertilizantes", "concentracion", "TEXT");
      addColumnIfMissing(db, "fertilizantes", "unidad_medida", "TEXT");
      db.execSync("DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'");
    }
  },
  {
    version: 50,
    statements: ["DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'"]
  },
  {
    version: 51,
    run(db: SQLiteDatabase) {
      addColumnIfMissing(db, "productores", "server_id", "TEXT");
      addColumnIfMissing(
        db,
        "productores",
        "sync_status",
        "TEXT NOT NULL DEFAULT 'synced'"
      );
      addColumnIfMissing(db, "productores", "sync_error_message", "TEXT");
      addColumnIfMissing(db, "sectores", "server_id", "TEXT");
      addColumnIfMissing(db, "sectores", "sync_status", "TEXT NOT NULL DEFAULT 'synced'");
      addColumnIfMissing(db, "sectores", "sync_error_message", "TEXT");
      addColumnIfMissing(db, "subsectores", "server_id", "TEXT");
      addColumnIfMissing(
        db,
        "subsectores",
        "sync_status",
        "TEXT NOT NULL DEFAULT 'synced'"
      );
      addColumnIfMissing(db, "subsectores", "sync_error_message", "TEXT");
      addColumnIfMissing(db, "parcelas", "server_id", "TEXT");
      addColumnIfMissing(db, "parcelas", "sync_status", "TEXT NOT NULL DEFAULT 'synced'");
      addColumnIfMissing(db, "parcelas", "sync_error_message", "TEXT");
      for (const table of ["productores", "sectores", "subsectores", "parcelas"]) {
        db.execSync(
          `UPDATE ${table}
           SET server_id = id
           WHERE server_id IS NULL
             AND sync_status = 'synced'`
        );
      }
      db.execSync("DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'");
    }
  },
  {
    version: 52,
    run(db: SQLiteDatabase) {
      addColumnIfMissing(db, "sectores", "public_id", "TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(db, "subsectores", "public_id", "TEXT NOT NULL DEFAULT ''");
      db.execSync(
        `UPDATE sectores SET public_id = id WHERE public_id = '' AND server_id IS NOT NULL`
      );
      db.execSync(
        `UPDATE subsectores SET public_id = id WHERE public_id = '' AND server_id IS NOT NULL`
      );
      db.execSync("DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'");
    }
  },
  {
    version: 53,
    statements: [
      `CREATE TABLE IF NOT EXISTS tipos_documento (
        id INTEGER PRIMARY KEY NOT NULL,
        code TEXT NOT NULL,
        name TEXT NOT NULL
       )`,
      "DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'"
    ]
  },
  {
    version: 54,
    run(db: SQLiteDatabase) {
      addColumnIfMissing(
        db,
        "ingredientes_activos",
        "public_id",
        "TEXT NOT NULL DEFAULT ''"
      );
      addColumnIfMissing(db, "ingredientes_activos", "server_id", "TEXT");
      addColumnIfMissing(
        db,
        "ingredientes_activos",
        "sync_status",
        "TEXT NOT NULL DEFAULT 'synced'"
      );
      addColumnIfMissing(db, "ingredientes_activos", "sync_error_message", "TEXT");
      addColumnIfMissing(db, "fertilizantes", "public_id", "TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(db, "fertilizantes", "server_id", "TEXT");
      addColumnIfMissing(
        db,
        "fertilizantes",
        "sync_status",
        "TEXT NOT NULL DEFAULT 'synced'"
      );
      addColumnIfMissing(db, "fertilizantes", "sync_error_message", "TEXT");
      addColumnIfMissing(db, "marcas_producto", "public_id", "TEXT NOT NULL DEFAULT ''");
      addColumnIfMissing(db, "marcas_producto", "server_id", "TEXT");
      addColumnIfMissing(
        db,
        "marcas_producto",
        "sync_status",
        "TEXT NOT NULL DEFAULT 'synced'"
      );
      addColumnIfMissing(db, "marcas_producto", "sync_error_message", "TEXT");

      for (const table of ["ingredientes_activos", "fertilizantes", "marcas_producto"]) {
        db.execSync(
          `UPDATE ${table}
            SET public_id = id
            WHERE public_id = ''
              AND server_id IS NOT NULL`
        );
        db.execSync(
          `UPDATE ${table}
            SET server_id = id
            WHERE server_id IS NULL
              AND sync_status = 'synced'`
        );
      }
      db.execSync("DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'");
    }
  },
  {
    version: 55,
    run(db: SQLiteDatabase) {
      db.execSync(`CREATE TABLE IF NOT EXISTS visita_receta_mezcla (
         local_id TEXT PRIMARY KEY NOT NULL,
         server_id TEXT,
         receta_local_id TEXT NOT NULL,
         numero INTEGER NOT NULL CHECK(numero > 0),
         coadyuvantes_ids TEXT,
         orden_mezcla TEXT,
         volumen_aplicacion TEXT,
         factor TEXT NOT NULL DEFAULT '1',
         factor_editable INTEGER NOT NULL DEFAULT 0 CHECK(factor_editable IN (0, 1)),
         sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
         created_at TEXT NOT NULL,
         updated_at TEXT NOT NULL,
         FOREIGN KEY (receta_local_id) REFERENCES visita_recetas(local_id) ON DELETE CASCADE
       )`);
      addColumnIfMissing(db, "visita_receta_fitosanidad", "mezcla_local_id", "TEXT");
      addColumnIfMissing(db, "visita_receta_fitosanidad", "dosis_producto", "TEXT");
      addColumnIfMissing(
        db,
        "visita_receta_fertilizacion",
        "factor",
        "TEXT NOT NULL DEFAULT '1'"
      );
      db.execSync(
        "UPDATE visita_receta_fitosanidad SET dosis_producto = dosis_ia WHERE dosis_producto IS NULL"
      );

      const rows = db.getAllSync<{
        local_id: string;
        receta_local_id: string;
        numero: number;
        objetivo: string;
        objetivo_nombre: string;
        coadyuvantes_ids: string | null;
        orden_mezcla: string | null;
        volumen_aplicacion: string | null;
        sync_status: string;
        created_at: string;
        updated_at: string;
      }>(`SELECT local_id, receta_local_id, numero, objetivo, objetivo_nombre,
                  coadyuvantes_ids, orden_mezcla, volumen_aplicacion, sync_status,
                  created_at, updated_at
           FROM visita_receta_fitosanidad
           WHERE mezcla_local_id IS NULL
           ORDER BY receta_local_id, numero, local_id`);
      const grouped = new Map<string, (typeof rows)[number]>();

      for (const row of rows) {
        const key = [
          row.receta_local_id,
          row.numero,
          row.objetivo,
          row.objetivo_nombre
        ].join("::");
        if (!grouped.has(key)) grouped.set(key, row);
      }

      for (const [key, row] of grouped) {
        const mezclaLocalId = `mezcla_${row.local_id}`;
        db.runSync(
          `INSERT OR IGNORE INTO visita_receta_mezcla
            (local_id, server_id, receta_local_id, numero, coadyuvantes_ids,
             orden_mezcla, volumen_aplicacion, factor, factor_editable,
             sync_status, created_at, updated_at)
            VALUES (?, NULL, ?, ?, ?, ?, ?, '1', 0, ?, ?, ?)`,
          mezclaLocalId,
          row.receta_local_id,
          row.numero,
          row.coadyuvantes_ids,
          row.orden_mezcla,
          row.volumen_aplicacion,
          row.sync_status,
          row.created_at,
          row.updated_at
        );
        const [recetaLocalId, numero, objetivo, objetivoNombre] = key.split("::");
        db.runSync(
          `UPDATE visita_receta_fitosanidad
            SET mezcla_local_id = ?
            WHERE receta_local_id = ? AND numero = ? AND objetivo = ?
              AND objetivo_nombre = ? AND mezcla_local_id IS NULL`,
          mezclaLocalId,
          recetaLocalId,
          Number(numero),
          objetivo,
          objetivoNombre
        );
      }

      db.execSync(
        "CREATE INDEX IF NOT EXISTS idx_visita_receta_mezcla_receta ON visita_receta_mezcla(receta_local_id)"
      );
      db.execSync(
        "CREATE INDEX IF NOT EXISTS idx_visita_receta_fitosanidad_mezcla ON visita_receta_fitosanidad(mezcla_local_id)"
      );
    }
  },
  {
    version: 56,
    run(db: SQLiteDatabase) {
      addColumnIfMissing(db, "visita_receta_mezcla", "cantidad_total_producto", "TEXT");
      db.execSync(
        `UPDATE visita_receta_mezcla
         SET cantidad_total_producto = (
           SELECT COALESCE(SUM(CAST(cantidad_total_producto AS REAL)), 0)
           FROM visita_receta_fitosanidad
           WHERE visita_receta_fitosanidad.mezcla_local_id = visita_receta_mezcla.local_id
             AND visita_receta_fitosanidad.cantidad_total_producto IS NOT NULL
             AND visita_receta_fitosanidad.cantidad_total_producto != ''
         )
         WHERE cantidad_total_producto IS NULL`
      );
    }
  },
  {
    version: 57,
    run(db: SQLiteDatabase) {
      addColumnIfMissing(db, "parcelas", "parcel_reference_point", "TEXT");
    }
  },
  {
    version: 58,
    statements: [
      `CREATE TABLE IF NOT EXISTS clima_estacion_cache (
        estacion_id TEXT PRIMARY KEY NOT NULL,
        payload_json TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    ]
  },
  {
    version: 59,
    run(db: SQLiteDatabase) {
      addColumnIfMissing(db, "productores", "catalog_owner_user_id", "TEXT");
      addColumnIfMissing(
        db,
        "productores",
        "catalog_visible",
        "INTEGER NOT NULL DEFAULT 0"
      );
      addColumnIfMissing(
        db,
        "productores",
        "created_locally",
        "INTEGER NOT NULL DEFAULT 0"
      );
      addColumnIfMissing(db, "parcelas", "catalog_owner_user_id", "TEXT");
      addColumnIfMissing(
        db,
        "parcelas",
        "catalog_visible",
        "INTEGER NOT NULL DEFAULT 0"
      );
      addColumnIfMissing(db, "sync_outbox", "owner_user_id", "TEXT");
      db.execSync("DROP TABLE IF EXISTS sync_failures_next");
      db.execSync(`CREATE TABLE sync_failures_next (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_user_id TEXT,
        entity_type TEXT NOT NULL,
        entity_local_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
        payload TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0 CHECK(retry_count >= 0),
        error_kind TEXT NOT NULL CHECK(error_kind IN ('transient', 'permanent')),
        error_message TEXT,
        outbox_created_at TEXT NOT NULL,
        last_attempt_at TEXT NOT NULL,
        failed_at TEXT NOT NULL,
        UNIQUE(owner_user_id, entity_type, entity_local_id)
      )`);
      db.execSync(`INSERT INTO sync_failures_next (
        id, owner_user_id, entity_type, entity_local_id, operation, payload,
        retry_count, error_kind, error_message, outbox_created_at,
        last_attempt_at, failed_at
      )
      SELECT id, NULL, entity_type, entity_local_id, operation, payload,
        retry_count, error_kind, error_message, outbox_created_at,
        last_attempt_at, failed_at
      FROM sync_failures`);
      db.execSync("DROP TABLE sync_failures");
      db.execSync("ALTER TABLE sync_failures_next RENAME TO sync_failures");
      db.execSync(
        "CREATE INDEX IF NOT EXISTS idx_productores_catalog_session ON productores(catalog_owner_user_id, catalog_visible, is_active)"
      );
      db.execSync(
        "CREATE INDEX IF NOT EXISTS idx_parcelas_catalog_session ON parcelas(catalog_owner_user_id, catalog_visible, is_active)"
      );
      db.execSync(
        "CREATE INDEX IF NOT EXISTS idx_sync_outbox_owner_order ON sync_outbox(owner_user_id, id)"
      );
      db.execSync(
        "CREATE INDEX IF NOT EXISTS idx_sync_failures_owner_kind ON sync_failures(owner_user_id, error_kind, failed_at)"
      );
      db.execSync("DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'");
    }
  }
];

function isLegacyPendingCalificacionEligible(raw: string | null, modulo: string) {
  if (!raw) return false;
  try {
    const receta = JSON.parse(raw) as Record<string, unknown>;
    const map = receta.modulosEvaluables as Record<string, boolean> | undefined;
    if (map) return map[modulo] === true;
    if (modulo === "plagas" || modulo === "enfermedades") {
      return (
        Array.isArray(receta.fitosanidad) &&
        receta.fitosanidad.some(
          (item) =>
            (item as { objetivo?: string }).objetivo ===
            (modulo === "plagas" ? "plaga" : "enfermedad")
        )
      );
    }
    if (modulo === "nutricion")
      return Array.isArray(receta.fertilizacion) && receta.fertilizacion.length > 0;
    if (modulo === "riego")
      return Boolean(
        (receta.riego as { tipoRecomendacion?: string } | null)?.tipoRecomendacion?.trim()
      );
    return (
      Array.isArray(receta.labores) &&
      receta.labores.some((item) => Boolean((item as { labor?: string }).labor?.trim()))
    );
  } catch {
    return false;
  }
}

function recreateSubsectoresAndParcelas(db: SQLiteDatabase) {
  db.execSync("DELETE FROM sync_outbox");
  db.execSync("DELETE FROM visita_receta_labores");
  db.execSync("DELETE FROM visita_receta_riego");
  db.execSync("DELETE FROM visita_receta_fertilizacion");
  db.execSync("DELETE FROM visita_receta_fitosanidad");
  db.execSync("DELETE FROM visita_recetas");
  db.execSync("DELETE FROM visita_labores_culturales");
  db.execSync("DELETE FROM visita_riegos");
  db.execSync("DELETE FROM visita_paso_observaciones");
  db.execSync("DELETE FROM visita_observacion_sanitaria_organos");
  db.execSync("DELETE FROM visita_observaciones_sanitarias");
  db.execSync("DELETE FROM visita_evaluaciones");
  db.execSync("DELETE FROM visitas_campo");
  db.execSync("DROP TABLE IF EXISTS parcelas");
  db.execSync("DROP TABLE IF EXISTS subsectores");
  db.execSync(findSchemaStatement("CREATE TABLE IF NOT EXISTS subsectores"));
  db.execSync(findSchemaStatement("CREATE TABLE IF NOT EXISTS parcelas"));
  db.execSync(
    "CREATE INDEX IF NOT EXISTS idx_subsectores_sector_id ON subsectores(sector_id)"
  );
  db.execSync(
    "CREATE INDEX IF NOT EXISTS idx_parcelas_subsector_id ON parcelas(subsector_id)"
  );
  db.execSync(
    "CREATE INDEX IF NOT EXISTS idx_parcelas_productor_subsector ON parcelas(productor_id, subsector_id)"
  );
  db.execSync("DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'");
}

function findSchemaStatement(prefix: string) {
  const statement = SQL_SCHEMA.find((schemaStatement) =>
    schemaStatement.startsWith(prefix)
  );

  if (!statement) {
    throw new Error(`Missing schema statement for ${prefix}.`);
  }

  return statement;
}

function relaxProductoresDocumentColumns(db: SQLiteDatabase) {
  const columns = db.getAllSync<{ name: string; notnull?: number }>(
    "PRAGMA table_info(productores)"
  );
  const documentTypeColumn = columns.find((column) => column.name === "document_type_id");
  const documentNumberColumn = columns.find(
    (column) => column.name === "document_number"
  );

  if (documentTypeColumn?.notnull !== 1 && documentNumberColumn?.notnull !== 1) {
    return;
  }

  db.execSync("PRAGMA defer_foreign_keys = ON");
  db.execSync("DROP TABLE IF EXISTS productores_next");
  db.execSync(`
    CREATE TABLE productores_next (
      id TEXT PRIMARY KEY NOT NULL,
      public_id TEXT NOT NULL,
      entity_type TEXT NOT NULL DEFAULT 'persona',
      document_type_id INTEGER,
      document_number TEXT,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  db.execSync(`
    INSERT OR REPLACE INTO productores_next (
      id,
      public_id,
      entity_type,
      document_type_id,
      document_number,
      first_name,
      last_name,
      phone,
      email,
      address,
      is_active,
      created_at,
      updated_at
    )
    SELECT
      id,
      public_id,
      COALESCE(entity_type, 'persona'),
      document_type_id,
      document_number,
      first_name,
      last_name,
      phone,
      email,
      address,
      is_active,
      created_at,
      updated_at
    FROM productores
  `);
  db.execSync("DROP TABLE productores");
  db.execSync("ALTER TABLE productores_next RENAME TO productores");
  db.execSync("DELETE FROM app_meta WHERE key = 'catalogs_downloaded_at'");
}

function addColumnIfMissing(
  db: SQLiteDatabase,
  tableName: string,
  columnName: string,
  columnDefinition: string
) {
  const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${tableName})`);

  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  db.execSync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
}

function dropColumnIfExists(db: SQLiteDatabase, tableName: string, columnName: string) {
  const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${tableName})`);

  if (!columns.some((column) => column.name === columnName)) {
    return;
  }

  db.execSync(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
}

export function runMigrations(db: SQLiteDatabase) {
  const currentVersion =
    db.getFirstSync<{ user_version: number }>("PRAGMA user_version")?.user_version ?? 0;

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion).sort(
    (a, b) => a.version - b.version
  );

  for (const migration of pending) {
    db.withTransactionSync(() => {
      if (migration.run) {
        migration.run(db);
      }

      for (const statement of migration.statements ?? []) {
        db.execSync(statement);
      }

      db.execSync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}
