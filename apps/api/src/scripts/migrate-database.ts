import { readEnvironmentVariables } from "../config/env.validation";
import { DATABASE_MIGRATIONS } from "../database/migrations";

type PgClient = {
  connect(): Promise<void>;
  end(): Promise<void>;
  query(sql: string, values?: readonly unknown[]): Promise<unknown>;
};

type CountResult = {
  rows?: Array<{ count: string }>;
};

type PgClientConstructor = new (options: Record<string, unknown>) => PgClient;

// pg does not ship TypeScript declarations in this workspace.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg") as { Client: PgClientConstructor };

async function run() {
  const environment = readEnvironmentVariables();
  const client = new Client({
    host: environment.DB_HOST,
    port: environment.DB_PORT,
    database: environment.DB_NAME,
    user: environment.DB_USER,
    password: environment.DB_PASSWORD,
    ssl: environment.DB_SSL
      ? { rejectUnauthorized: environment.DB_SSL_REJECT_UNAUTHORIZED }
      : false,
    application_name: "agrogest-vsm-migrations"
  });

  await client.connect();

  try {
    await client.query("SELECT pg_advisory_lock(842017052026)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id varchar(160) PRIMARY KEY,
        descripcion text NOT NULL,
        aplicado_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    for (const migration of DATABASE_MIGRATIONS) {
      await client.query("BEGIN");

      try {
        const result = (await client.query(
          "SELECT id FROM schema_migrations WHERE id = $1",
          [migration.id]
        )) as { rows?: unknown[] };

        if ((result.rows?.length ?? 0) === 0) {
          console.log(`Applying database migration: ${migration.id}`);
          await client.query(migration.sql);
          await client.query(
            "INSERT INTO schema_migrations (id, descripcion) VALUES ($1, $2)",
            [migration.id, migration.description]
          );
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    await assertCount(
      client,
      "SELECT COUNT(*)::text AS count FROM provincias WHERE codigo LIKE '20%'",
      8,
      "Piura provincias"
    );
    await assertCount(
      client,
      "SELECT COUNT(*)::text AS count FROM distritos WHERE ubigeo LIKE '20%'",
      65,
      "Piura distritos"
    );
    await assertColumnExists(client, "sectores", "distrito_id");
    await assertColumnExists(client, "parcelas", "productor_id");
    await assertColumnExists(client, "etapas_fenologicas", "orden");
    await assertColumnExists(client, "etapas_fenologicas", "tipo");
    await assertColumnExists(client, "sub_etapas", "id");
    await assertColumnExists(client, "sub_etapas", "etapa_fenologica_id");
    await assertColumnExists(client, "sub_etapas", "nombre");
    await assertColumnExists(client, "sub_etapas", "orden");
    await assertColumnExists(client, "sub_etapas", "descripcion");
    await assertColumnExists(client, "sub_etapas", "porcentaje");
    await assertColumnExists(client, "sub_etapas", "estado");
    await assertColumnExists(client, "visitas_campo", "sub_etapa_id");
    await assertColumnExists(client, "visitas_campo", "sub_etapa_porcentaje");
    await assertColumnExists(client, "visitas_campo", "area_ha");
    await assertColumnExists(client, "nutrientes", "cultivo_id");
    await assertColumnExists(client, "nutrientes", "nombre");
    await assertColumnExists(client, "nutrientes", "descripcion");
    await assertColumnExists(client, "detalle_nutrientes", "nutriente_id");
    await assertColumnExists(client, "detalle_nutrientes", "nombre");
    await assertColumnExists(client, "detalle_nutrientes", "descripcion");
    await assertColumnExists(client, "visita_riegos", "fuente_agua");
    await assertColumnExists(client, "visita_riegos", "tipo_suelo");
    await assertColumnExists(client, "visita_riegos", "humedad_suelo");
    await assertColumnExists(client, "visita_riegos", "estres_hidrico");
    await assertColumnExists(client, "marcas_producto", "unidad_medida");
    await assertColumnExists(client, "fertilizantes", "concentracion");
    await assertColumnExists(client, "fertilizantes", "unidad_medida");
    await assertColumnExists(
      client,
      "visita_receta_fertilizacion",
      "nutriente_id"
    );
    await assertColumnExists(
      client,
      "visita_receta_fertilizacion",
      "nutriente_nombre"
    );
    await assertMinimumCount(
      client,
      `SELECT COUNT(*)::text AS count
       FROM marcas_producto
       WHERE NULLIF(trim(concentracion), '') IS NOT NULL
         AND NULLIF(trim(unidad_medida), '') IS NOT NULL`,
      21,
      "marcas de producto con concentracion y unidad"
    );
    await assertMinimumCount(
      client,
      `SELECT COUNT(*)::text AS count
       FROM fertilizantes
       WHERE NULLIF(trim(concentracion), '') IS NOT NULL
         AND NULLIF(trim(unidad_medida), '') IS NOT NULL`,
      15,
      "fertilizantes con concentracion y unidad"
    );
    await assertTableExists(client, "clima", "puntos_climaticos");
    await assertTableExists(client, "clima", "lecturas");
    await assertTableExists(client, "clima", "pronosticos");
    await assertTableExists(client, "clima", "reservorios");
    await assertTableExists(client, "clima", "lecturas_reservorios");
    await assertTableExists(client, "clima", "estaciones_estado_sincronizacion");
    await assertColumnNullable(client, "clima", "estaciones_meteorologicas", "latitud");
    await assertColumnNullable(client, "clima", "estaciones_meteorologicas", "longitud");
    await assertCount(
      client,
      "SELECT COUNT(*)::text AS count FROM clima.fuentes_datos WHERE codigo='weatherlink'",
      1,
      "fuente WeatherLink"
    );
    await assertForeignKey(
      client,
      "clima",
      "estaciones_estado_sincronizacion",
      "fuente_id",
      "clima",
      "fuentes_datos",
      "id"
    );
    await assertForeignKey(
      client,
      "clima",
      "estaciones_estado_sincronizacion",
      "estacion_id",
      "clima",
      "estaciones_meteorologicas",
      "id"
    );
    await assertForeignKey(
      client,
      "clima",
      "lecturas_reservorios",
      "reservorio_id",
      "clima",
      "reservorios",
      "id"
    );
    await assertForeignKey(
      client,
      "clima",
      "lecturas_reservorios",
      "fuente_id",
      "clima",
      "fuentes_datos",
      "id"
    );
    await assertForeignKey(
      client,
      "clima",
      "lecturas_reservorios",
      "creado_por",
      "public",
      "usuarios",
      "public_id"
    );
    console.log("Database migrations validated successfully.");
  } finally {
    await client.query("SELECT pg_advisory_unlock(842017052026)");
    await client.end();
  }
}

async function assertCount(
  client: PgClient,
  sql: string,
  expected: number,
  label: string
) {
  const result = (await client.query(sql)) as CountResult;
  const actual = Number(result.rows?.[0]?.count ?? -1);

  if (actual !== expected) {
    throw new Error(`Expected ${expected} ${label}, found ${actual}.`);
  }
}

async function assertMinimumCount(
  client: PgClient,
  sql: string,
  minimum: number,
  label: string
) {
  const result = (await client.query(sql)) as CountResult;
  const actual = Number(result.rows?.[0]?.count ?? -1);

  if (actual < minimum) {
    throw new Error(`Expected at least ${minimum} ${label}, found ${actual}.`);
  }
}

async function assertColumnExists(
  client: PgClient,
  tableName: string,
  columnName: string
) {
  const result = (await client.query(
    `SELECT COUNT(*)::text AS count
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = $1
       AND column_name = $2`,
    [tableName, columnName]
  )) as CountResult;

  if (Number(result.rows?.[0]?.count ?? 0) !== 1) {
    throw new Error(`Expected column ${tableName}.${columnName} to exist.`);
  }
}

async function assertTableExists(
  client: PgClient,
  schemaName: string,
  tableName: string
) {
  const result = (await client.query(
    `SELECT COUNT(*)::text AS count FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
    [schemaName, tableName]
  )) as CountResult;
  if (Number(result.rows?.[0]?.count ?? 0) !== 1) {
    throw new Error(`Expected table ${schemaName}.${tableName} to exist.`);
  }
}

async function assertColumnNullable(
  client: PgClient,
  schemaName: string,
  tableName: string,
  columnName: string
) {
  const result = (await client.query(
    `SELECT COUNT(*)::text AS count
     FROM information_schema.columns
     WHERE table_schema = $1
       AND table_name = $2
       AND column_name = $3
       AND is_nullable = 'YES'`,
    [schemaName, tableName, columnName]
  )) as CountResult;

  if (Number(result.rows?.[0]?.count ?? 0) !== 1) {
    throw new Error(
      `Expected column ${schemaName}.${tableName}.${columnName} to be nullable.`
    );
  }
}

async function assertForeignKey(
  client: PgClient,
  schemaName: string,
  tableName: string,
  columnName: string,
  referencedSchemaName: string,
  referencedTableName: string,
  referencedColumnName: string
) {
  const result = (await client.query(
    `SELECT COUNT(*)::text AS count
     FROM information_schema.table_constraints constraint_info
     INNER JOIN information_schema.key_column_usage source_column
       ON source_column.constraint_schema = constraint_info.constraint_schema
      AND source_column.constraint_name = constraint_info.constraint_name
     INNER JOIN information_schema.constraint_column_usage target_column
       ON target_column.constraint_schema = constraint_info.constraint_schema
      AND target_column.constraint_name = constraint_info.constraint_name
     WHERE constraint_info.constraint_type = 'FOREIGN KEY'
       AND constraint_info.table_schema = $1
       AND constraint_info.table_name = $2
       AND source_column.column_name = $3
       AND target_column.table_schema = $4
       AND target_column.table_name = $5
       AND target_column.column_name = $6`,
    [
      schemaName,
      tableName,
      columnName,
      referencedSchemaName,
      referencedTableName,
      referencedColumnName
    ]
  )) as CountResult;

  if (Number(result.rows?.[0]?.count ?? 0) !== 1) {
    throw new Error(
      `Expected foreign key ${schemaName}.${tableName}.${columnName} to reference ${referencedSchemaName}.${referencedTableName}.${referencedColumnName}.`
    );
  }
}

void run().catch((error: unknown) => {
  console.error("Database migration failed.", error);
  process.exitCode = 1;
});
