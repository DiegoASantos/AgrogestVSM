import { getDatabase } from "../../../shared/database/connection";
import { getCatalogSessionUserId } from "../../../shared/database/catalog-session";
import { getNowIsoString } from "../../../shared/database/sqlite-utils";
import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";
import { generateLocalId, generatePublicId } from "../../../shared/utils/local-id";
import type { HarvestPaymentInput } from "@agrogest/validation";

export function savePagoCosecha(input: HarvestPaymentInput) {
  const db = getDatabase();
  const ownerUserId = getCatalogSessionUserId(db);
  if (!ownerUserId) {
    throw new Error("No hay una sesion autenticada.");
  }

  const localId = generateLocalId();
  const publicId = generatePublicId();
  const now = getNowIsoString();

  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO pagos_cosecha (
        local_id, public_id, productor_id, nombres_acreedor, apellidos_acreedor,
        tipo_documento_acreedor, nro_documento_acreedor, banco, nro_cuenta,
        server_id, sync_status, created_at, updated_at, sync_error_message, owner_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', ?, ?, NULL, ?)`,
      localId,
      publicId,
      input.productorId,
      input.creditorFirstName,
      input.creditorLastName,
      input.creditorDocumentType,
      input.creditorDocumentNumber,
      input.bank,
      input.accountNumber,
      now,
      now,
      ownerUserId
    );
    insertSyncOutboxEntry(db, {
      entityType: "pagos_cosecha",
      entityLocalId: localId,
      operation: "create",
      createdAt: now
    });
  });
}
