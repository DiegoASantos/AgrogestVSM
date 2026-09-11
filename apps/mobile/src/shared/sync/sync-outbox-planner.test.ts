import { describe, expect, it } from "vitest";

import type { SyncOutboxItem } from "../database/sync-outbox";
import { orderSyncOutboxEntries } from "./sync-outbox-planner";

function makeEntry(
  id: number,
  entityType: SyncOutboxItem["entityType"],
  entityLocalId: string
): SyncOutboxItem {
  return {
    id,
    entityType,
    entityLocalId,
    operation: "create",
    payload: null,
    retryCount: 0,
    createdAt: "2026-09-10T16:00:00.000Z"
  };
}

describe("orderSyncOutboxEntries", () => {
  it("interleaves 328 visit records by aggregate instead of placing every parent first", () => {
    const parents = Array.from({ length: 164 }, (_, index) =>
      makeEntry(index + 1, "visitas_campo", `visita-${index}`)
    );
    const children = Array.from({ length: 164 }, (_, index) =>
      makeEntry(index + 165, "visita_evaluaciones", `evaluacion-${index}`)
    );

    const ordered = orderSyncOutboxEntries([...parents, ...children], (entry) =>
      entry.entityType === "visita_evaluaciones"
        ? entry.entityLocalId.replace("evaluacion-", "visita-")
        : null
    );

    expect(ordered).toHaveLength(328);
    expect(ordered.slice(0, 4).map((entry) => entry.entityLocalId)).toEqual([
      "visita-0",
      "evaluacion-0",
      "visita-1",
      "evaluacion-1"
    ]);
  });

  it("keeps catalog dependencies before complete visit aggregates", () => {
    const entries = [
      makeEntry(1, "visita_recetas", "receta-1"),
      makeEntry(2, "marcas_producto", "marca-1"),
      makeEntry(3, "visitas_campo", "visita-1"),
      makeEntry(4, "ingredientes_activos", "ingrediente-1"),
      makeEntry(5, "parcelas", "parcela-1")
    ];

    const ordered = orderSyncOutboxEntries(entries, (entry) =>
      entry.entityType === "visita_recetas" ? "visita-1" : null
    );

    expect(ordered.map((entry) => entry.entityLocalId)).toEqual([
      "ingrediente-1",
      "marca-1",
      "parcela-1",
      "visita-1",
      "receta-1"
    ]);
  });
});
