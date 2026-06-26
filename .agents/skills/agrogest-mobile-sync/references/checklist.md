# Checklist offline y sync

- Revisar `schema.ts`, `migrations.ts`, `sync-outbox.ts`, `sync-entities.ts`,
  `sync-handlers.ts` y `sync-engine.ts`.
- Mantener escritura local y outbox coherentes.
- Sincronizar padre antes que hijos.
- Separar IDs locales y remotos.
- Evitar duplicados en reintentos.
- Reconciliar conflictos explícitamente.
- Detener ante error de auth sin perder pendientes ni actualizar `lastSyncTime`.
- Para fallos transitorios, limitar reintentos (máx 5) y marcar `error` solo al
  agotarlos, conservando las demás entradas en cola.
- Para binarios: storage durable, límites, auth, lifecycle local y reanudación.
- Probar migración, reinicio, reintento, conflicto, update y delete.
