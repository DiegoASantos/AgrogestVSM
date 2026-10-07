import { describe, expect, it } from "vitest";
import { PAGOS_PRODUCTORES_MIGRATION } from "./066-pagos-productores";

describe("066 pagos de productores", () => {
  const sql = PAGOS_PRODUCTORES_MIGRATION.sql;

  it("adds the producer payment tables and the admin web creditor source", () => {
    expect(PAGOS_PRODUCTORES_MIGRATION.id).toBe("066-pagos-productores");
    expect(sql).toContain("CHECK (origen IN ('PRODUCTOR', 'MOBILE', 'ADMIN_WEB'))");
    expect(sql).toContain("CREATE TABLE pago_productores");
    expect(sql).toContain("CREATE TABLE detalle_pago_productores");
    expect(sql).toContain("lote varchar(150) NOT NULL");
    expect(sql).toContain("public_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE");
  });

  it("protects financial references, manual percentage range and explicit statuses", () => {
    expect(sql).toContain(
      "productor_id bigint NOT NULL REFERENCES productores(id) ON DELETE RESTRICT"
    );
    expect(sql).toContain(
      "pago_productor_id bigint NOT NULL REFERENCES pago_productores(id) ON DELETE RESTRICT"
    );
    expect(sql).toContain(
      "acreedor_id bigint NOT NULL REFERENCES acreedores_cosecha(id) ON DELETE RESTRICT"
    );
    expect(sql).toContain(
      "tipo_documento_id_productor smallint NOT NULL REFERENCES tipos_documento(id) ON DELETE RESTRICT"
    );
    expect(sql).toContain(
      "supervisor_id bigint NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT"
    );
    expect(sql).toContain("CHECK (porcentaje_peso BETWEEN 0 AND 100)");
    expect(sql).toContain("DEFAULT 'NO_APLICA'");
    expect(sql).toContain("'BORRADOR', 'OBSERVADO', 'PENDIENTE', 'PAGADO', 'ANULADO'");
    expect(sql).toContain(
      "Rollback operativo: retirar UI/rutas y conservar datos capturados"
    );
  });
});
