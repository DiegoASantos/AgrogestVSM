import "reflect-metadata";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PRECIOS_SEMANALES_Y_TESORERO_PAGOS_MIGRATION as migration } from "./074-precios-semanales-y-tesorero-pagos";
import { EstimacionesService } from "../../modules/estimaciones/application/estimaciones.service";

// Always creates its own cluster: never reads .env or an existing DB connection.
const postgresBin = process.env.POSTGRES_BIN ?? "C:/Program Files/PostgreSQL/18/bin";
const postgresAvailable = existsSync(path.join(postgresBin, "initdb.exe"));

describe.skipIf(!postgresAvailable)("Migración 074 en PostgreSQL temporal", () => {
  let directory: string;
  let started = false;
  let db: DataSource;
  const run = (executable: string, args: string[]) => execFileSync(path.join(postgresBin, executable), args, { stdio: "ignore", timeout: 30000 });

  beforeAll(async () => {
    directory = mkdtempSync(path.join(tmpdir(), "agrogest-spec115-"));
    const listener = createServer();
    await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
    const address = listener.address();
    if (!address || typeof address === "string") throw new Error("No se pudo reservar puerto temporal.");
    const port = address.port;
    await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
    run("initdb.exe", ["-D", directory, "-U", "postgres", "-A", "trust", "--no-locale", "--encoding=UTF8", "--no-sync"]);
    started = true;
    run("pg_ctl.exe", ["-D", directory, "-l", path.join(directory, "postgres.log"), "-o", `-p ${port} -h 127.0.0.1`, "-w", "start"]);
    db = new DataSource({ type: "postgres", host: "127.0.0.1", port, username: "postgres", database: "postgres", synchronize: false });
    await db.initialize();
    await db.query(`CREATE TABLE usuarios (id bigint PRIMARY KEY, nombres text, apellidos text, activo boolean NOT NULL DEFAULT true);
      CREATE TABLE roles (id smallserial PRIMARY KEY, codigo varchar(30) UNIQUE, nombre varchar(60), descripcion text);
      CREATE TABLE usuario_roles (usuario_id bigint REFERENCES usuarios(id), rol_id smallint REFERENCES roles(id));
      CREATE TABLE estimaciones_visitas (testigo text);
      INSERT INTO estimaciones_visitas VALUES ('meta anterior');
      INSERT INTO usuarios VALUES (1, 'Editor', 'Prueba', true);
      INSERT INTO roles(codigo, nombre) VALUES ('ADMIN', 'Administrador');
      INSERT INTO usuario_roles SELECT 1, id FROM roles WHERE codigo = 'ADMIN';`);
  }, 60000);

  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
    if (started) run("pg_ctl.exe", ["-D", directory, "-m", "fast", "-w", "stop"]);
    if (directory && path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep + "agrogest-spec115-")) {
      rmSync(directory, { recursive: true, force: true });
    }
  }, 60000);

  it("crea la tabla, es repetible y conserva datos/roles existentes sin asignar tesoreros", async () => {
    await db.query(migration.sql);
    await db.query(migration.sql);
    expect(await db.query("SELECT testigo FROM estimaciones_visitas")).toEqual([{ testigo: "meta anterior" }]);
    expect(await db.query("SELECT codigo FROM roles WHERE codigo = 'TESORERO_PAGOS'")).toHaveLength(1);
    expect(await db.query("SELECT ur.* FROM usuario_roles ur JOIN roles r ON r.id = ur.rol_id WHERE r.codigo = 'TESORERO_PAGOS'")).toHaveLength(0);
  });

  it("guarda, edita, retira y reactiva por semana sin cambiar la auditoría de creación", async () => {
    const service = new EstimacionesService(db);
    const first = await service.saveWeekPrices("2026-10-21", { precioMinimo: 20.5, precioMaximo: 30 }, "1");
    expect(first.priceRange).toMatchObject({ precioMinimo: 20.5, precioMaximo: 30 });
    const updated = await service.saveWeekPrices("2026-10-25", { precioMinimo: 22, precioMaximo: 30 }, "1");
    expect(updated.priceRange?.publicId).toBe(first.priceRange?.publicId);
    expect(updated.priceRange?.createdAt).toEqual(first.priceRange?.createdAt);
    expect((await service.getWeekPrices("2026-10-26")).priceRange).toBeNull();
    await service.saveWeekPrices("2026-10-21", { precioMinimo: null, precioMaximo: null }, "1");
    expect((await service.getWeekPrices("2026-10-21")).priceRange).toBeNull();
    expect(await db.query("SELECT activo FROM estimaciones_precios")).toEqual([{ activo: false }]);
    const reactivated = await service.saveWeekPrices("2026-10-21", { precioMinimo: 0, precioMaximo: 0 }, "1");
    expect(reactivated.priceRange?.publicId).toBe(first.priceRange?.publicId);
  });

  it("resuelve guardados simultáneos sin duplicados", async () => {
    const service = new EstimacionesService(db);
    await Promise.all([10, 20, 30].map((value) => service.saveWeekPrices("2027-01-01", { precioMinimo: value, precioMaximo: value }, "1")));
    expect(await db.query("SELECT count(*)::int AS cantidad FROM estimaciones_precios WHERE fecha_inicio = '2026-12-28'")).toEqual([{ cantidad: 1 }]);
  });

  it("impone fechas, importes, unicidad y referencias incluso fuera del servicio", async () => {
    for (const [start, end, min, max, actor] of [
      ["2026-11-03", "2026-11-09", 1, 2, 1],
      ["2026-11-02", "2026-11-09", 1, 2, 1],
      ["2026-11-02", "2026-11-08", -1, 2, 1],
      ["2026-11-02", "2026-11-08", 3, 2, 1],
      ["2026-11-02", "2026-11-08", 1, 10000000000, 1],
      ["2026-11-02", "2026-11-08", 1, 2, 999]
    ]) {
      await expect(db.query(`INSERT INTO estimaciones_precios(fecha_inicio, fecha_fin, precio_minimo, precio_maximo, creado_por_usuario_id, actualizado_por_usuario_id)
        VALUES ($1, $2, $3, $4, $5, $5)`, [start, end, min, max, actor])).rejects.toThrow();
    }
  });
});
