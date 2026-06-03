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
        const result = await client.query(
          "SELECT id FROM schema_migrations WHERE id = $1",
          [migration.id]
        ) as { rows?: unknown[] };

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

    await assertCount(client, "SELECT COUNT(*)::text AS count FROM provincias WHERE codigo LIKE '20%'", 8, "Piura provincias");
    await assertCount(client, "SELECT COUNT(*)::text AS count FROM distritos WHERE ubigeo LIKE '20%'", 65, "Piura distritos");
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
  const result = await client.query(sql) as CountResult;
  const actual = Number(result.rows?.[0]?.count ?? -1);

  if (actual !== expected) {
    throw new Error(`Expected ${expected} ${label}, found ${actual}.`);
  }
}

async function assertColumnExists(
  client: PgClient,
  tableName: string,
  columnName: string
) {
  const result = await client.query(
    `SELECT COUNT(*)::text AS count
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = $1
       AND column_name = $2`,
    [tableName, columnName]
  ) as CountResult;

  if (Number(result.rows?.[0]?.count ?? 0) !== 1) {
    throw new Error(`Expected column ${tableName}.${columnName} to exist.`);
  }
}

void run().catch((error: unknown) => {
  console.error("Database migration failed.", error);
  process.exitCode = 1;
});
