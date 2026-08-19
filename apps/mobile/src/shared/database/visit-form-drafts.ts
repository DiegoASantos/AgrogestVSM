import { type SQLiteDatabase } from "expo-sqlite";

import { getDatabase } from "./connection";
import { getNowIsoString } from "./sqlite-utils";

export const VISIT_FORM_DRAFT_SCHEMA_VERSION = 1;

export type VisitFormDraftModule =
  | "datos"
  | "plagas"
  | "enfermedades"
  | "nutricion"
  | "riego"
  | "labores"
  | "receta"
  | "mezclas";

export type VisitFormDraftIdentity = {
  ownerUserId: string;
  scopeKey: string;
  moduleKey: VisitFormDraftModule;
};

type VisitFormDraftRow = {
  payload_json: string;
  schema_version: number;
};

export function buildVisitDraftScopeKey(visitaId: string) {
  return `visit:${visitaId}`;
}

export function buildNewVisitDraftScopeKey(parcelaId: string) {
  return `new:${parcelaId}`;
}

export function readVisitFormDraft<T>(
  identity: VisitFormDraftIdentity,
  db: SQLiteDatabase = getDatabase()
): T | null {
  const row = db.getFirstSync<VisitFormDraftRow>(
    `SELECT payload_json, schema_version
     FROM visit_form_drafts
     WHERE owner_user_id = ? AND scope_key = ? AND module_key = ?
     LIMIT 1`,
    identity.ownerUserId,
    identity.scopeKey,
    identity.moduleKey
  );

  if (!row || row.schema_version !== VISIT_FORM_DRAFT_SCHEMA_VERSION) {
    return null;
  }

  try {
    const payload = JSON.parse(row.payload_json) as unknown;
    return payload !== null && typeof payload === "object" ? (payload as T) : null;
  } catch {
    return null;
  }
}

export function writeVisitFormDraft(
  identity: VisitFormDraftIdentity,
  payload: unknown,
  db: SQLiteDatabase = getDatabase()
) {
  db.runSync(
    `INSERT INTO visit_form_drafts (
       owner_user_id, scope_key, module_key, payload_json, schema_version, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(owner_user_id, scope_key, module_key) DO UPDATE SET
       payload_json = excluded.payload_json,
       schema_version = excluded.schema_version,
       updated_at = excluded.updated_at`,
    identity.ownerUserId,
    identity.scopeKey,
    identity.moduleKey,
    JSON.stringify(payload),
    VISIT_FORM_DRAFT_SCHEMA_VERSION,
    getNowIsoString()
  );
}

export function deleteVisitFormDraft(
  identity: VisitFormDraftIdentity,
  db: SQLiteDatabase = getDatabase()
) {
  db.runSync(
    `DELETE FROM visit_form_drafts
     WHERE owner_user_id = ? AND scope_key = ? AND module_key = ?`,
    identity.ownerUserId,
    identity.scopeKey,
    identity.moduleKey
  );
}

export function deleteVisitFormDraftsForVisit(
  ownerUserId: string,
  visitaId: string,
  db: SQLiteDatabase = getDatabase()
) {
  db.runSync(
    `DELETE FROM visit_form_drafts
     WHERE owner_user_id = ? AND scope_key = ?`,
    ownerUserId,
    buildVisitDraftScopeKey(visitaId)
  );
}
