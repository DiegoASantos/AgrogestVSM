import type { SyncOutboxItem } from "../database/sync-outbox";

type VisitLocalIdResolver = (entry: SyncOutboxItem) => string | null;

const CATALOG_PRIORITY: Partial<Record<SyncOutboxItem["entityType"], number>> = {
  productores: 0,
  sectores: 0,
  ingredientes_activos: 0,
  fertilizantes: 0,
  marcas_producto: 1,
  subsectores: 1,
  parcelas: 2
};

const VISIT_ENTITY_PRIORITY: Partial<Record<SyncOutboxItem["entityType"], number>> = {
  visitas_campo: 0,
  visita_evaluaciones: 1,
  visita_observaciones_sanitarias: 2,
  visita_paso_observaciones: 3,
  visita_riegos: 4,
  visita_labores_culturales: 5,
  visita_recetas: 6,
  visita_receta_mezcla: 6,
  visita_receta_fitosanidad: 6,
  visita_receta_fertilizacion: 6,
  visita_receta_riego: 6,
  visita_receta_labores: 6,
  visita_calificaciones: 7
};

type VisitGroup = {
  firstEntryId: number;
  entries: SyncOutboxItem[];
};

export function orderSyncOutboxEntries(
  entries: SyncOutboxItem[],
  resolveVisitLocalId: VisitLocalIdResolver
): SyncOutboxItem[] {
  const catalogs: SyncOutboxItem[] = [];
  const visitGroups = new Map<string, VisitGroup>();

  for (const entry of entries) {
    if (CATALOG_PRIORITY[entry.entityType] !== undefined) {
      catalogs.push(entry);
      continue;
    }

    const visitLocalId =
      entry.entityType === "visitas_campo"
        ? entry.entityLocalId
        : resolveVisitLocalId(entry);
    const groupKey = visitLocalId ? `visita:${visitLocalId}` : `sin-visita:${entry.id}`;
    const current = visitGroups.get(groupKey);

    if (current) {
      current.entries.push(entry);
      current.firstEntryId = Math.min(current.firstEntryId, entry.id);
    } else {
      visitGroups.set(groupKey, {
        firstEntryId: entry.id,
        entries: [entry]
      });
    }
  }

  catalogs.sort((left, right) => {
    const priorityDifference =
      (CATALOG_PRIORITY[left.entityType] ?? 3) -
      (CATALOG_PRIORITY[right.entityType] ?? 3);
    return priorityDifference || left.id - right.id;
  });

  const orderedVisits = [...visitGroups.values()]
    .sort((left, right) => left.firstEntryId - right.firstEntryId)
    .flatMap((group) =>
      group.entries.sort((left, right) => {
        const priorityDifference =
          (VISIT_ENTITY_PRIORITY[left.entityType] ?? 8) -
          (VISIT_ENTITY_PRIORITY[right.entityType] ?? 8);
        return priorityDifference || left.id - right.id;
      })
    );

  return [...catalogs, ...orderedVisits];
}
