import type { HarvestRecordInput } from "@agrogest/validation";

import { getCatalogSessionUserId } from "../../../shared/database/catalog-session";
import { getDatabase } from "../../../shared/database/connection";
import { getNowIsoString } from "../../../shared/database/sqlite-utils";
import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";
import { generateLocalId, generatePublicId } from "../../../shared/utils/local-id";

type CreditorSnapshot = {
  creditorFirstName: string;
  creditorLastName: string;
  creditorDocumentType: "DNI" | "RUC";
  creditorDocumentNumber: string;
  bank: "INTERBANK" | "BCP" | "CAJA_PIURA" | "BBVA";
  accountNumber: string;
};

export function saveRegistroCosecha(input: HarvestRecordInput) {
  const db = getDatabase();
  const ownerUserId = getCatalogSessionUserId(db);
  if (!ownerUserId) throw new Error("No hay una sesion autenticada.");

  const creditor = db.getFirstSync<{
    productor_id: string;
    nombres_acreedor: string;
    apellidos_acreedor: string;
    tipo_documento_acreedor: CreditorSnapshot["creditorDocumentType"];
    nro_documento_acreedor: string;
    banco: CreditorSnapshot["bank"];
    nro_cuenta: string;
  }>(
    `SELECT productor_id, nombres_acreedor, apellidos_acreedor, tipo_documento_acreedor,
      nro_documento_acreedor, banco, nro_cuenta FROM acreedores_cosecha
     WHERE local_id = ? AND owner_user_id = ? AND catalog_visible = 1`,
    input.creditorId,
    ownerUserId
  );

  if (!creditor || creditor.productor_id !== input.productorId) {
    throw new Error("Acreedor no disponible para el productor seleccionado.");
  }

  const localId = generateLocalId();
  const publicId = generatePublicId();
  const now = getNowIsoString();

  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO registros_cosecha (
        local_id, public_id, productor_id, acreedor_local_id, cantidad_jabas, precio_jaba,
        fecha_registro, fecha_cosecha, nombres_acreedor, apellidos_acreedor,
        tipo_documento_acreedor, nro_documento_acreedor, banco, nro_cuenta,
        server_id, sync_status, created_at, updated_at, sync_error_message, owner_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', ?, ?, NULL, ?)`,
      localId,
      publicId,
      input.productorId,
      input.creditorId,
      input.crateQuantity,
      Number(input.cratePrice).toFixed(2),
      input.registrationDate,
      input.harvestDate,
      creditor.nombres_acreedor,
      creditor.apellidos_acreedor,
      creditor.tipo_documento_acreedor,
      creditor.nro_documento_acreedor,
      creditor.banco,
      creditor.nro_cuenta,
      now,
      now,
      ownerUserId
    );
    insertSyncOutboxEntry(db, {
      entityType: "registros_cosecha",
      entityLocalId: localId,
      operation: "create",
      createdAt: now
    });
  });

  return localId;
}
