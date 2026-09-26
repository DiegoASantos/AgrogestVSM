import type { HarvestCreditorInput } from "@agrogest/validation";

import { getCatalogSessionUserId } from "../../../shared/database/catalog-session";
import { getDatabase } from "../../../shared/database/connection";
import { getNowIsoString } from "../../../shared/database/sqlite-utils";
import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";
import { generateLocalId, generatePublicId } from "../../../shared/utils/local-id";
import { productoresRepository } from "../../productores/repositories/productores.repository";
import {
  getAcreedoresCosecha,
  type AcreedorCosechaRemote
} from "./acreedores-cosecha.remote";

export type AcreedorCosecha = HarvestCreditorInput & {
  localId: string;
  publicId: string;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  catalogVisible: boolean;
};

type AcreedorCosechaRow = {
  local_id: string;
  public_id: string;
  productor_id: string;
  nombres_acreedor: string;
  apellidos_acreedor: string;
  tipo_documento_acreedor: "DNI" | "RUC";
  nro_documento_acreedor: string;
  banco: HarvestCreditorInput["bank"];
  nro_cuenta: string;
  server_id: string | null;
  sync_status: "pending" | "synced" | "error";
  catalog_visible: number;
};

export function getAcreedoresCosechaLocales(productorId: string): AcreedorCosecha[] {
  const db = getDatabase();
  const ownerUserId = getCatalogSessionUserId(db);
  if (!ownerUserId) return [];

  return db
    .getAllSync<AcreedorCosechaRow>(
      `SELECT local_id, public_id, productor_id, nombres_acreedor, apellidos_acreedor,
        tipo_documento_acreedor, nro_documento_acreedor, banco, nro_cuenta,
        server_id, sync_status, catalog_visible
       FROM acreedores_cosecha
       WHERE productor_id = ? AND owner_user_id = ? AND catalog_visible = 1
       ORDER BY created_at ASC, local_id ASC`,
      productorId,
      ownerUserId
    )
    .map(toAcreedor);
}

export function saveAcreedorCosecha(input: HarvestCreditorInput) {
  const db = getDatabase();
  const ownerUserId = getCatalogSessionUserId(db);
  if (!ownerUserId) throw new Error("No hay una sesion autenticada.");

  const localId = generateLocalId();
  const publicId = generatePublicId();
  const now = getNowIsoString();

  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO acreedores_cosecha (
        local_id, public_id, productor_id, nombres_acreedor, apellidos_acreedor,
        tipo_documento_acreedor, nro_documento_acreedor, banco, nro_cuenta,
        server_id, sync_status, created_at, updated_at, sync_error_message, owner_user_id, catalog_visible
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', ?, ?, NULL, ?, 1)`,
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
      entityType: "acreedores_cosecha",
      entityLocalId: localId,
      operation: "create",
      createdAt: now
    });
  });

  return localId;
}

export async function refreshAcreedoresCosecha(productorId: string) {
  const db = getDatabase();
  const ownerUserId = getCatalogSessionUserId(db);
  const productor = productoresRepository.getById(productorId);
  if (!ownerUserId || !productor?.serverId) return getAcreedoresCosechaLocales(productorId);

  const remoteCreditors = await getAcreedoresCosecha(productor.serverId);

  db.withTransactionSync(() => {
    db.runSync(
      `UPDATE acreedores_cosecha
       SET catalog_visible = 0
       WHERE productor_id = ? AND owner_user_id = ? AND sync_status = 'synced'`,
      productorId,
      ownerUserId
    );

    for (const creditor of remoteCreditors) {
      upsertRemoteCreditor(db, creditor, productorId, ownerUserId);
    }
  });

  return getAcreedoresCosechaLocales(productorId);
}

function upsertRemoteCreditor(
  db: ReturnType<typeof getDatabase>,
  creditor: AcreedorCosechaRemote,
  productorId: string,
  ownerUserId: string
) {
  const existing = db.getFirstSync<{ local_id: string; sync_status: string }>(
    `SELECT local_id, sync_status FROM acreedores_cosecha
     WHERE server_id = ? AND owner_user_id = ? LIMIT 1`,
    creditor.id,
    ownerUserId
  );

  if (existing && existing.sync_status !== "pending") {
    db.runSync(
      `UPDATE acreedores_cosecha SET public_id = ?, productor_id = ?, nombres_acreedor = ?,
       apellidos_acreedor = ?, tipo_documento_acreedor = ?, nro_documento_acreedor = ?,
       banco = ?, nro_cuenta = ?, sync_status = 'synced', sync_error_message = NULL,
       updated_at = ?, catalog_visible = 1 WHERE local_id = ?`,
      creditor.publicId,
      productorId,
      creditor.creditorFirstName,
      creditor.creditorLastName,
      creditor.creditorDocumentType,
      creditor.creditorDocumentNumber,
      creditor.bank,
      creditor.accountNumber,
      getNowIsoString(),
      existing.local_id
    );
    return;
  }

  if (!existing) {
    const pendingEquivalent = db.getFirstSync<{ local_id: string }>(
      `SELECT local_id FROM acreedores_cosecha
       WHERE productor_id = ? AND owner_user_id = ? AND server_id IS NULL
         AND tipo_documento_acreedor = ? AND nro_documento_acreedor = ?
         AND banco = ? AND nro_cuenta = ? LIMIT 1`,
      productorId,
      ownerUserId,
      creditor.creditorDocumentType,
      creditor.creditorDocumentNumber,
      creditor.bank,
      creditor.accountNumber
    );
    if (pendingEquivalent) return;

    const now = getNowIsoString();
    db.runSync(
      `INSERT INTO acreedores_cosecha (
        local_id, public_id, productor_id, nombres_acreedor, apellidos_acreedor,
        tipo_documento_acreedor, nro_documento_acreedor, banco, nro_cuenta,
        server_id, sync_status, created_at, updated_at, sync_error_message, owner_user_id, catalog_visible
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, NULL, ?, 1)`,
      generateLocalId(),
      creditor.publicId,
      productorId,
      creditor.creditorFirstName,
      creditor.creditorLastName,
      creditor.creditorDocumentType,
      creditor.creditorDocumentNumber,
      creditor.bank,
      creditor.accountNumber,
      creditor.id,
      now,
      now,
      ownerUserId
    );
  }
}

function toAcreedor(row: AcreedorCosechaRow): AcreedorCosecha {
  return {
    localId: row.local_id,
    publicId: row.public_id,
    productorId: row.productor_id,
    creditorFirstName: row.nombres_acreedor,
    creditorLastName: row.apellidos_acreedor,
    creditorDocumentType: row.tipo_documento_acreedor,
    creditorDocumentNumber: row.nro_documento_acreedor,
    bank: row.banco,
    accountNumber: row.nro_cuenta,
    serverId: row.server_id,
    syncStatus: row.sync_status,
    catalogVisible: row.catalog_visible === 1
  };
}
