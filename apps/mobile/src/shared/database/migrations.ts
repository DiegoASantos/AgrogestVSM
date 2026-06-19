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
      "DROP TABLE IF EXISTS sectores",
      ...SQL_SCHEMA.filter((statement) =>
        [
          "CREATE TABLE IF NOT EXISTS departamentos",
          "CREATE TABLE IF NOT EXISTS provincias",
          "CREATE TABLE IF NOT EXISTS distritos",
          "CREATE TABLE IF NOT EXISTS sectores",
          "CREATE TABLE IF NOT EXISTS parcelas"
        ].some((prefix) => statement.startsWith(prefix))
      ),
      "CREATE INDEX IF NOT EXISTS idx_parcelas_productor_id ON parcelas(productor_id)",
      "CREATE INDEX IF NOT EXISTS idx_parcelas_productor_sector ON parcelas(productor_id, sector_id)"
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
        "TEXT DEFAULT NULL CHECK(fuente_agua IS NULL OR fuente_agua IN ('subterranea', 'superficial', 'pluvial'))"
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
  }
];

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
