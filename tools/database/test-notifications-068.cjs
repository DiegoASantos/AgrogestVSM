const assert = require("node:assert/strict");
const { Client } = require("../../apps/api/node_modules/pg");
const { NOTIFICACIONES_OPERATIVAS_VISITAS_MIGRATION } = require("../../apps/api/dist/database/migrations/068-notificaciones-operativas-visitas.js");
const { NotificacionesService } = require("../../apps/api/dist/modules/notificaciones/application/notificaciones.service.js");

async function main() {
  const client = new Client({
    host: "127.0.0.1", port: Number(process.env.NOTIFICATIONS_SMOKE_PORT),
    user: "postgres", database: "postgres"
  });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE usuarios (id bigint PRIMARY KEY, nombres text, apellidos text);
      CREATE TABLE productores (
        id bigint PRIMARY KEY, nombres text, apellidos text, entidad text,
        activo boolean, creado_at timestamptz,
        ultima_confirmacion_continuidad_at timestamptz
      );
      CREATE TABLE parcelas (id bigint PRIMARY KEY, productor_id bigint, activo boolean);
      CREATE TABLE visitas_campo (
        id bigint PRIMARY KEY, parcela_id bigint, agronomo_usuario_id bigint,
        fecha_visita date, activo boolean
      );
    `);
    await client.query(NOTIFICACIONES_OPERATIVAS_VISITAS_MIGRATION.sql);
    await client.query(NOTIFICACIONES_OPERATIVAS_VISITAS_MIGRATION.sql);
    await client.query(`
      INSERT INTO usuarios VALUES
        (1, 'Agronomo', 'Uno'), (2, 'Admin', 'Uno'), (3, 'Analista', 'Dos');
      INSERT INTO productores VALUES
        (10, 'Ana', 'Perez', 'persona', true, now() - interval '60 days', NULL),
        (11, 'Fundo', 'Norte', 'fundo', true, now() - interval '60 days', NULL),
        (12, 'Luz', 'Diaz', 'persona', false, now() - interval '60 days', NULL);
      INSERT INTO parcelas VALUES (20, 10, true), (21, 10, true), (22, 11, true), (23, 12, false);
      INSERT INTO visitas_campo VALUES
        (30, 20, 1, '2026-10-13', true), (31, 21, 1, '2026-10-13', true),
        (32, 22, 1, '2026-10-13', true), (33, 23, 1, '2026-10-13', true);
    `);
    const service = new NotificacionesService({ query: async (sql, params) => (await client.query(sql, params)).rows });
    const first = (await service.list("2")).data;
    assert.equal(first.items.filter((item) => item.kind === "VISITAS_DUPLICADAS").length, 1);
    assert.equal(first.items.find((item) => item.kind === "VISITAS_DUPLICADAS").cantidadVisitas, 2);
    assert.equal(first.items.filter((item) => item.kind === "PRODUCTOR_SIN_VISITA").length, 0);

    await client.query(`
      INSERT INTO productores VALUES
        (13, 'Eva', 'Rios', 'persona', true, now() - interval '45 days', NULL),
        (14, 'Rosa', 'Luna', 'persona', true, now() - interval '44 days', NULL);
      INSERT INTO parcelas VALUES (24, 13, true), (25, 14, true);
    `);
    const threshold = (await service.list("3")).data;
    assert.deepEqual(
      threshold.items.filter((item) => item.kind === "PRODUCTOR_SIN_VISITA").map((item) => item.productorId),
      ["13"]
    );
    await client.query("UPDATE productores SET ultima_confirmacion_continuidad_at = now() WHERE id = 13");

    await service.markRead("2", {
      productorId: "10", agronomoUsuarioId: "1", fechaVisita: "2026-10-13"
    });
    await service.markRead("2", {
      productorId: "10", agronomoUsuarioId: "1", fechaVisita: "2026-10-13"
    });
    assert.equal((await service.list("2")).data.unreadCount, 0);
    assert.equal((await service.list("3")).data.unreadCount, 1);

    await client.query("UPDATE visitas_campo SET activo = false WHERE id IN (30, 31, 32, 33)");
    const inactive = (await service.list("3")).data;
    assert.equal(inactive.items.filter((item) => item.kind === "VISITAS_DUPLICADAS").length, 0);
    assert.deepEqual(inactive.items.filter((item) => item.kind === "PRODUCTOR_SIN_VISITA").map((item) => item.productorId), ["10"]);
    await client.query("UPDATE productores SET ultima_confirmacion_continuidad_at = now() WHERE id = 10");
    assert.equal((await service.list("3")).data.unreadCount, 0);
    process.stdout.write("PostgreSQL notification smoke passed.\n");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
