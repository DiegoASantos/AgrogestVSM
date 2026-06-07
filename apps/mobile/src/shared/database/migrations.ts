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
      "ALTER TABLE visita_recomendaciones ADD COLUMN sync_error_message TEXT",
      "ALTER TABLE visita_productos_recomendados ADD COLUMN sync_error_message TEXT",
      "CREATE INDEX idx_visitas_campo_sync ON visitas_campo(sync_status)",
      "CREATE INDEX idx_evaluaciones_sync ON visita_evaluaciones(sync_status)",
      "CREATE INDEX idx_obs_sanitarias_sync ON visita_observaciones_sanitarias(sync_status)",
      "CREATE INDEX idx_recomendaciones_sync ON visita_recomendaciones(sync_status)",
      "CREATE INDEX idx_prod_recomendados_sync ON visita_productos_recomendados(sync_status)",
      "CREATE INDEX idx_evaluaciones_visita ON visita_evaluaciones(visita_local_id)",
      "CREATE INDEX idx_obs_sanitarias_visita ON visita_observaciones_sanitarias(visita_local_id)",
      "CREATE INDEX idx_recomendaciones_visita ON visita_recomendaciones(visita_local_id)",
      "CREATE INDEX idx_prod_recomendados_visita ON visita_productos_recomendados(visita_local_id)"
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
    statements: [
      "ALTER TABLE sync_outbox ADD COLUMN payload TEXT"
    ]
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
      "DELETE FROM visita_recomendaciones",
      "DELETE FROM visita_productos_recomendados",
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
      addColumnIfMissing(
        db,
        "visita_paso_observaciones",
        "sync_error_message",
        "TEXT"
      );
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
  }
];

function addColumnIfMissing(
  db: SQLiteDatabase,
  tableName: string,
  columnName: string,
  columnDefinition: string
) {
  const columns = db.getAllSync<{ name: string }>(
    `PRAGMA table_info(${tableName})`
  );

  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  db.execSync(
    `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`
  );
}

function dropColumnIfExists(
  db: SQLiteDatabase,
  tableName: string,
  columnName: string
) {
  const columns = db.getAllSync<{ name: string }>(
    `PRAGMA table_info(${tableName})`
  );

  if (!columns.some((column) => column.name === columnName)) {
    return;
  }

  db.execSync(`ALTER TABLE ${tableName} DROP COLUMN ${columnName}`);
}

export function runMigrations(db: SQLiteDatabase) {
  const currentVersion =
    db.getFirstSync<{ user_version: number }>("PRAGMA user_version")
      ?.user_version ?? 0;

  const pending = MIGRATIONS
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

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
