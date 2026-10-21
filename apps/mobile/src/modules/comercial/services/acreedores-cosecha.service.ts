import type { HarvestCreditorInput } from "@agrogest/validation";

import { getCatalogSessionUserId } from "../../../shared/database/catalog-session";
import { getDatabase } from "../../../shared/database/connection";
import { getNowIsoString } from "../../../shared/database/sqlite-utils";
import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";
import { generateLocalId, generatePublicId } from "../../../shared/utils/local-id";
import { productoresRepository } from "../../productores/repositories/productores.repository";
export type HarvestCreditorIdentityInput = Omit<HarvestCreditorInput, "bank" | "accountNumber"> & {
  bank: HarvestCreditorInput["bank"] | null;
  accountNumber: string | null;
};
import {
  getAcreedoresCosecha,
  type AcreedorCosechaRemote
} from "./acreedores-cosecha.remote";

export type AcreedorCosecha = HarvestCreditorIdentityInput & {
  localId: string;
  publicId: string;
  serverId: string | null;
  syncStatus: "pending" | "synced" | "error";
  catalogVisible: boolean;
  approvalStatus: "INCOMPLETE" | "PENDING" | "APPROVED" | "OBSERVED";
  source: "PRODUCTOR" | "MOBILE" | "ADMIN_WEB";
  reviewObservation: string | null;
};

type AcreedorCosechaRow = {
  local_id: string;
  public_id: string;
  productor_id: string;
  nombres_acreedor: string;
  apellidos_acreedor: string;
  tipo_documento_acreedor: "DNI" | "RUC";
  nro_documento_acreedor: string;
  banco: HarvestCreditorInput["bank"] | null;
  nro_cuenta: string | null;
  server_id: string | null;
  sync_status: "pending" | "synced" | "error";
  catalog_visible: number;
  approval_status: AcreedorCosecha["approvalStatus"];
  source: AcreedorCosecha["source"];
  review_observation: string | null;
};

export function getAcreedoresCosechaLocales(productorId: string): AcreedorCosecha[] {
  const db = getDatabase();
  const ownerUserId = getCatalogSessionUserId(db);
  if (!ownerUserId) return [];

  return db
    .getAllSync<AcreedorCosechaRow>(
      `SELECT local_id, public_id, productor_id, nombres_acreedor, apellidos_acreedor,
        tipo_documento_acreedor, nro_documento_acreedor, banco, nro_cuenta,
        server_id, sync_status, catalog_visible, approval_status, source, review_observation
       FROM acreedores_cosecha
       WHERE productor_id = ? AND owner_user_id = ? AND catalog_visible = 1
       ORDER BY created_at ASC, local_id ASC`,
      productorId,
      ownerUserId
    )
    .map(toAcreedor);
}

export function saveAcreedorCosecha(input: HarvestCreditorIdentityInput, producerDocument?: { productorId: string; typeId: number; number: string }) {
  const db = getDatabase();
  const ownerUserId = getCatalogSessionUserId(db);
  if (!ownerUserId) throw new Error("No hay una sesion autenticada.");
  const ownedProducer = db.getFirstSync<{ id: string }>(
    `SELECT id FROM productores WHERE id = ? AND catalog_owner_user_id = ?
     AND (catalog_visible = 1 OR created_locally = 1)`,
    input.productorId, ownerUserId
  );
  if (!ownedProducer || (producerDocument && producerDocument.productorId !== input.productorId)) {
    throw new Error("El productor no esta disponible para este acreedor.");
  }

  const localId = generateLocalId();
  const publicId = generatePublicId();
  const now = getNowIsoString();

  db.withTransactionSync(() => {
    if (producerDocument) {
      const productor = productoresRepository.getById(producerDocument.productorId);
      if (!productor || productor.entityType !== "persona" ||
        (productor.documentNumber && productor.documentNumber !== producerDocument.number) ||
        (productor.documentTypeId && productor.documentTypeId !== producerDocument.typeId)) {
        throw new Error("El documento del productor no coincide con el acreedor.");
      }
      const update = db.runSync(
        `UPDATE productores SET document_type_id = ?, document_number = ?, updated_at = ?, sync_status = 'pending'
         WHERE id = ? AND catalog_owner_user_id = ?`,
        producerDocument.typeId, producerDocument.number, now, productor.id, ownerUserId
      );
      if (update.changes !== 1) throw new Error("No se pudo actualizar el documento del productor.");
      if (productor.serverId) insertSyncOutboxEntry(db, {
        entityType: "productores", entityLocalId: productor.id, operation: "update", createdAt: now
      });
    }
    db.runSync(
      `INSERT INTO acreedores_cosecha (
        local_id, public_id, productor_id, nombres_acreedor, apellidos_acreedor,
        tipo_documento_acreedor, nro_documento_acreedor, banco, nro_cuenta,
        server_id, sync_status, created_at, updated_at, sync_error_message, owner_user_id, catalog_visible, approval_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'pending', ?, ?, NULL, ?, 1, ?)`,
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
      ownerUserId,
      input.bank && input.accountNumber ? "PENDING" : "INCOMPLETE"
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

export function completarAcreedorCosecha(localId: string, bank: HarvestCreditorInput["bank"], accountNumber: string) {
  const db = getDatabase();
  const owner = getCatalogSessionUserId(db);
  if (!owner || !/^\d{1,30}$/.test(accountNumber)) throw new Error("Cuenta inválida.");
  const creditor = db.getFirstSync<{ approval_status: string }>(
    "SELECT approval_status FROM acreedores_cosecha WHERE local_id = ? AND owner_user_id = ?",
    localId, owner
  );
  if (creditor?.approval_status !== "INCOMPLETE") throw new Error("El acreedor ya tiene cuenta registrada.");
  const now = getNowIsoString();
  db.withTransactionSync(() => {
    db.runSync(`UPDATE acreedores_cosecha SET banco = ?, nro_cuenta = ?, approval_status = 'PENDING',
      sync_status = 'pending', updated_at = ? WHERE local_id = ? AND owner_user_id = ?`,
      bank, accountNumber, now, localId, owner);
    insertSyncOutboxEntry(db, {
      entityType: "acreedores_cosecha", entityLocalId: localId, operation: "update", createdAt: now
    });
  });
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
       banco = ?, nro_cuenta = ?, approval_status = ?, source = ?, review_observation = ?,
       sync_status = 'synced', sync_error_message = NULL,
       updated_at = ?, catalog_visible = 1 WHERE local_id = ?`,
      creditor.publicId,
      productorId,
      creditor.creditorFirstName,
      creditor.creditorLastName,
      creditor.creditorDocumentType,
      creditor.creditorDocumentNumber,
      creditor.bank,
      creditor.accountNumber,
      creditor.approvalStatus,
      creditor.source,
      creditor.reviewObservation,
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
         AND banco IS ? AND nro_cuenta IS ? LIMIT 1`,
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
        server_id, sync_status, created_at, updated_at, sync_error_message, owner_user_id, catalog_visible,
        approval_status, source, review_observation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, NULL, ?, 1, ?, ?, ?)`,
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
      ownerUserId,
      creditor.approvalStatus,
      creditor.source,
      creditor.reviewObservation
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
    catalogVisible: row.catalog_visible === 1,
    approvalStatus: row.approval_status,
    source: row.source,
    reviewObservation: row.review_observation
  };
}
