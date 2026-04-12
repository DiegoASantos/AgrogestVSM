import { type SQLiteDatabase } from "expo-sqlite";

import { SQL_SCHEMA } from "./schema";

type Migration = {
  version: number;
  statements: readonly string[];
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
  }
];

export function runMigrations(db: SQLiteDatabase) {
  const currentVersion =
    db.getFirstSync<{ user_version: number }>("PRAGMA user_version")
      ?.user_version ?? 0;

  const pending = MIGRATIONS
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    db.withTransactionSync(() => {
      for (const statement of migration.statements) {
        db.execSync(statement);
      }
      db.execSync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}
