import "reflect-metadata";

import path from "node:path";

import { DataSource } from "typeorm";

import { readEnvironmentVariables } from "../config/env.validation";
import { DATABASE_MIGRATIONS } from "../database/migrations";

type PgClient = {
  connect(): Promise<void>;
  end(): Promise<void>;
  query(sql: string, values?: readonly unknown[]): Promise<{ rows?: unknown[] }>;
};

type PgClientConstructor = new (options: Record<string, unknown>) => PgClient;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client } = require("pg") as { Client: PgClientConstructor };

const BOOTSTRAP_CONFIRMATION_VARIABLE = "ALLOW_DATABASE_BOOTSTRAP";

async function run() {
  assertBootstrapAllowed(process.env[BOOTSTRAP_CONFIRMATION_VARIABLE]);

  const environment = readEnvironmentVariables();
  const connectionOptions = {
    host: environment.DB_HOST,
    port: environment.DB_PORT,
    database: environment.DB_NAME,
    user: environment.DB_USER,
    password: environment.DB_PASSWORD,
    ssl: environment.DB_SSL
      ? { rejectUnauthorized: environment.DB_SSL_REJECT_UNAUTHORIZED }
      : false
  };
  const client = new Client({
    ...connectionOptions,
    application_name: "agrogest-vsm-bootstrap"
  });

  await client.connect();

  try {
    await client.query("SELECT pg_advisory_lock(842017052027)");
    await assertSchemaIsEmpty(client, environment.DB_SCHEMA);
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    await client.query("CREATE EXTENSION IF NOT EXISTS postgis");

    const entitiesPattern = path
      .join(__dirname, "../modules/**/*.entity.js")
      .replaceAll("\\", "/");
    const dataSource = new DataSource({
      type: "postgres",
      ...connectionOptions,
      username: environment.DB_USER,
      schema: environment.DB_SCHEMA,
      entities: [entitiesPattern],
      synchronize: false,
      logging: false
    });

    await dataSource.initialize();
    if (dataSource.entityMetadatas.length === 0) {
      await dataSource.destroy();
      throw new Error(`No TypeORM entities found at ${entitiesPattern}.`);
    }
    await dataSource.synchronize(false);
    await dataSource.destroy();

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
        console.log(`Applying bootstrap migration: ${migration.id}`);
        await client.query(migration.sql);
        await client.query(
          `INSERT INTO schema_migrations (id, descripcion)
           VALUES ($1, $2)
           ON CONFLICT (id) DO NOTHING`,
          [migration.id, migration.description]
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log(
      `Database bootstrap completed for ${environment.DB_NAME}.${environment.DB_SCHEMA}.`
    );
  } finally {
    await client.query("SELECT pg_advisory_unlock(842017052027)");
    await client.end();
  }
}

export function assertBootstrapAllowed(value: string | undefined) {
  if (value?.trim().toLowerCase() !== "true") {
    throw new Error(
      `${BOOTSTRAP_CONFIRMATION_VARIABLE}=true is required to bootstrap a database.`
    );
  }
}

async function assertSchemaIsEmpty(client: PgClient, schema: string) {
  const result = await client.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = $1
       AND table_type = 'BASE TABLE'
       AND table_name <> 'spatial_ref_sys'
     ORDER BY table_name`,
    [schema]
  );
  const rows = (result.rows ?? []) as Array<{ table_name?: string }>;

  if (rows.length > 0) {
    const tableNames = rows
      .map((row) => row.table_name)
      .filter((tableName): tableName is string => Boolean(tableName));

    throw new Error(
      `Database bootstrap requires an empty schema. Found: ${tableNames.join(", ")}.`
    );
  }
}

if (require.main === module) {
  void run().catch((error: unknown) => {
    console.error("Database bootstrap failed.", error);
    process.exitCode = 1;
  });
}
