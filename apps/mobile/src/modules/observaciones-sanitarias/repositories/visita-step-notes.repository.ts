import { getDatabase } from "../../../shared/database/connection";
import { insertSyncOutboxEntry } from "../../../shared/database/sync-outbox";
import { getNowIsoString } from "../../../shared/database/sqlite-utils";
import { generateLocalId } from "../../../shared/utils/local-id";
import type { VisitaStepNote } from "../types";

type SyncStatus = "pending" | "synced" | "error";

type StepNoteRow = {
  local_id: string;
  server_id: string | null;
  visita_local_id: string;
  step_number: number;
  observation: string | null;
  recommendation: string | null;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
};

type UpsertStepNoteInput = {
  observation?: string | null;
  recommendation?: string | null;
  serverId?: string | null;
  syncStatus?: SyncStatus;
};

const STEP_NOTE_COLUMNS = `
  local_id,
  server_id,
  visita_local_id,
  step_number,
  observation,
  recommendation,
  sync_status,
  created_at,
  updated_at
`;

export const visitaStepNotesRepository = {
  getByVisitaAndStep(visitaLocalId: string, stepNumber: number) {
    const db = getDatabase();
    const row = db.getFirstSync<StepNoteRow>(
      `SELECT ${STEP_NOTE_COLUMNS}
       FROM visita_paso_observaciones
       WHERE visita_local_id = ? AND step_number = ?
       LIMIT 1`,
      visitaLocalId,
      stepNumber
    );

    return row ? mapStepNoteRow(row) : null;
  },

  getById(localId: string) {
    const db = getDatabase();
    const row = db.getFirstSync<StepNoteRow>(
      `SELECT ${STEP_NOTE_COLUMNS}
       FROM visita_paso_observaciones
       WHERE local_id = ?
       LIMIT 1`,
      localId
    );

    return row ? mapStepNoteRow(row) : null;
  },

  upsert(visitaLocalId: string, stepNumber: number, input: UpsertStepNoteInput) {
    const existingStepNote = this.getByVisitaAndStep(visitaLocalId, stepNumber);

    if (existingStepNote) {
      return this.update(existingStepNote.id, input);
    }

    const db = getDatabase();
    const localId = generateLocalId();
    const timestamp = getNowIsoString();

    db.withTransactionSync(() => {
      db.runSync(
        `INSERT INTO visita_paso_observaciones (
          local_id,
          server_id,
          visita_local_id,
          step_number,
          observation,
          recommendation,
          sync_status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        localId,
        input.serverId ?? null,
        visitaLocalId,
        stepNumber,
        input.observation ?? null,
        input.recommendation ?? null,
        input.syncStatus ?? "pending",
        timestamp,
        timestamp
      );

      insertSyncOutboxEntry(db, {
        entityType: "visita_paso_observaciones",
        entityLocalId: localId,
        operation: "create",
        createdAt: timestamp
      });
    });

    const stepNote = this.getById(localId);

    if (!stepNote) {
      throw new Error("No se pudo guardar la nota del paso.");
    }

    return stepNote;
  },

  update(localId: string, input: UpsertStepNoteInput) {
    const db = getDatabase();
    const timestamp = getNowIsoString();
    const sets: string[] = [];
    const params: Array<string | null> = [];

    if (input.observation !== undefined) {
      sets.push("observation = ?");
      params.push(input.observation);
    }

    if (input.recommendation !== undefined) {
      sets.push("recommendation = ?");
      params.push(input.recommendation);
    }

    if (input.serverId !== undefined) {
      sets.push("server_id = ?");
      params.push(input.serverId);
    }

    if (input.syncStatus !== undefined) {
      sets.push("sync_status = ?");
      params.push(input.syncStatus);
    }

    sets.push("updated_at = ?");
    params.push(timestamp);
    params.push(localId);

    db.withTransactionSync(() => {
      const result = db.runSync(
        `UPDATE visita_paso_observaciones
         SET ${sets.join(", ")}
         WHERE local_id = ?`,
        ...params
      );

      if (result.changes < 1) {
        throw new Error("No se encontro la nota del paso para actualizar.");
      }

      const isSyncUpdate =
        input.syncStatus !== undefined || input.serverId !== undefined;

      if (!isSyncUpdate) {
        db.runSync(
          `UPDATE visita_paso_observaciones SET sync_status = 'pending' WHERE local_id = ?`,
          localId
        );
        insertSyncOutboxEntry(db, {
          entityType: "visita_paso_observaciones",
          entityLocalId: localId,
          operation: "update",
          createdAt: timestamp
        });
      }
    });

    const stepNote = this.getById(localId);

    if (!stepNote) {
      throw new Error("No se pudo leer la nota actualizada.");
    }

    return stepNote;
  }
};

function mapStepNoteRow(row: StepNoteRow): VisitaStepNote {
  return {
    id: row.local_id,
    serverId: row.server_id,
    syncStatus: row.sync_status,
    visitaId: row.visita_local_id,
    stepNumber: row.step_number,
    observation: row.observation,
    recommendation: row.recommendation,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
