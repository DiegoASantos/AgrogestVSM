import type { DatabaseMigration } from "./001-territorial-sectors-and-piura-geography";

export const DETALLES_PAGOS_PRODUCTORES_MIGRATION: DatabaseMigration = {
  id: "072-detalles-pagos-productores",
  description: "Agrega fecha de pago y precisión de cálculo a detalles de pagos de productores.",
  sql: `
ALTER TABLE detalle_pago_productores
  ADD COLUMN fecha_pago date,
  ALTER COLUMN precio_jaba TYPE numeric(14,6),
  ALTER COLUMN precio_kilo TYPE numeric(14,6),
  ALTER COLUMN sub_total TYPE numeric(14,6);

CREATE INDEX idx_pago_productores_recepcion_cupo
  ON pago_productores(sistema_origen, codigo_productor_origen, nro_guia, lote, fecha_recepcion);

CREATE OR REPLACE FUNCTION validar_porcentaje_nuevo_detalle_pago()
RETURNS trigger AS $$
BEGIN
  IF NEW.porcentaje_peso <= 0 OR NEW.porcentaje_peso > 100 THEN
    RAISE EXCEPTION 'El porcentaje de peso debe ser mayor que 0 y menor o igual que 100.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_porcentaje_nuevo_detalle_pago
  BEFORE INSERT OR UPDATE OF porcentaje_peso ON detalle_pago_productores
  FOR EACH ROW EXECUTE FUNCTION validar_porcentaje_nuevo_detalle_pago();

-- Rollback operativo: retirar código dependiente y conservar fecha_pago/precisión;
-- no reducir la escala ni eliminar fechas de pagos ya capturados.
`
};
