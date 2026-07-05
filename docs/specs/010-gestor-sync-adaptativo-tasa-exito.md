---
title: Gestor de sincronización adaptativo con tasa de éxito para redes inestables
status: implemented
numero: "010"
area: mobile-sync
created: 2026-07-04
approved_by: Usuario via Codex, 2026-07-04
implemented_in: apps/mobile/src/shared/sync/sync-manager.ts
---

# Spec 010: Gestor de sincronización adaptativo con tasa de éxito para redes inestables

## Implementado en

- `apps/mobile/src/shared/sync/sync-manager.ts`
- `apps/mobile/src/shared/sync/sync-state-store.ts`
- `apps/mobile/src/shared/sync/sync-requests.ts`
- `apps/mobile/src/shared/sync/use-sync.ts`
- `apps/mobile/src/shared/database/migrations.ts`
- `apps/mobile/src/shared/database/schema.ts`
- `apps/mobile/src/shared/sync/sync-status-indicator.tsx`
- `docs/adr/003-sync-adaptativo-por-tasa-exito.md`
- `docs/architecture/mobile-offline-sync.md`
- `docs/runbooks/local-development.md`

## Contexto

El modelo binario online/offline actual no refleja la realidad de campo. Una red puede estar "conectada" pero ser tan inestable que degrade la experiencia drásticamente. Por otro lado, una red puede ser algo lenta (satelital,2G en zonas rurales) y sin embargo completar todas sus requests.

### Problema concreto

Actualmente `requestSync({ immediate: true })` se invoca de forma bloqueante tras cada guardado (`visita-receta-screen.tsx:489`). Si la red es inestable:

1. El usuario espera segundos (o decenas de segundos) viendo un spinner.
2. Las requests fallan por timeout.
3. La experiencia se degrada innecesariamente cuando el guardado local en SQLite ya fue exitoso.

### Hipótesis errónea que esta spec corrige

> "Si hay conectividad (NetInfo), sincronizo."

**Realidad**: hay tres estados, no dos:

| Estado | Descripción | Acción |
|--------|-------------|--------|
| **ESTABLE** | Tasa de éxito ≥ 70% en ventana reciente | Sync normal |
| **INESTABLE** | Tasa de éxito < 70% y ≥ 30% en ventana reciente | Backoff adaptativo |
| **SIN RED** | NetInfo reporta desconexión | Esperar |

La decisión no se basa en latencia (ms) sino en **tasa de éxito** sobre una
ventana deslizante de intentos recientes. Esto evita penalizar redes lentas pero
confiables y protege la UX ante redes intermitentes.

## Alcance

### Incluido

- `SyncManager`: módulo que evalúa la calidad de red por tasa de éxito y decide
  cuándo sincronizar.
- Ventana deslizante de N intentos (configurable, default 10) con tasa de éxito
  como métrica.
- Backoff adaptativo basado en tasa de éxito, no en latencia.
- Timeout natural del cliente HTTP (sin timeout artificial de 3s ni similar).
- Desacople del `requestSync` bloqueante: el guardado local y el sync son
  independientes.
- Indicador visual no intrusivo del estado de sincronización (ícono de status,
  no spinner bloqueante).
- Restauración automática a estado ESTABLE tras 3 éxitos consecutivos.

### Excluido

- Cambios en el esquema de `sync_outbox` (ya existe).
- Cambios en la API o en el contrato de sincronización.
- Sincronización en segundo plano cuando la app está en background (fuera de
  alcance inicial).
- Cola de prioridad (todos los items del outbox tienen igual prioridad).
- Métricas o telemetría de red para analítica.

## Requisitos

### Funcionales

- RF-001: El guardado de cualquier entidad (recetas, visitas, etc.) debe
  completarse en SQLite local de forma instantánea, sin esperar al sync remoto.
- RF-002: El sync se dispara en background mediante un intervalo configurable
  (default 30s cuando no hay items pendientes), nunca bloqueando la UI.
- RF-003: `SyncManager` mantiene una ventana deslizante de los últimos N
  intentos (default N=10) con resultado éxito/falla.
- RF-004: Si la tasa de éxito en la ventana es ≥ 70%, el sync opera normalmente.
- RF-005: Si la tasa de éxito en la ventana es < 70%, se aplica backoff
  adaptativo: 15s → 45s → 2min → 5min.
- RF-006: Si la tasa de éxito en la ventana es < 20%, el intervalo mínimo entre
  reintentos es 2min.
- RF-007: Cada request de sync exitosa resetea parcialmente el backoff
  (reduce el contador). Tres éxitos consecutivos restauran el estado a ESTABLE.
- RF-008: No se aplica timeout artificial a las requests de sync. Se usa el
  timeout por defecto del cliente HTTP.
- RF-009: La UI muestra el estado de sync con un ícono discreto (✓ sincronizado
  / ⟳ sincronizando / ⚠ pendiente), sin bloquear la interacción del usuario.
- RF-010: Cuando NetInfo reporta desconexión total, el sync se pausa hasta que
  se recupere la conectividad.

### No funcionales

- RNF-001: La lógica de `SyncManager` debe ser independiente de la UI
  (service puro, testable).
- RNF-002: No se introducen nuevas dependencias de terceros.
- RNF-003: El contador de backoff persiste entre sesiones de la app (no se
  reinicia al abrir/cerrar la app).
- RNF-004: El consumo de batería debe ser mínimo: cuando el outbox está vacío,
  el intervalo de verificación es de 30s; cuando está en backoff máximo, de
  5min.

## Contratos afectados

### Mobile

| Capa | Cambio |
|------|--------|
| `sync-outbox.ts` | Sin cambios. La tabla y las operaciones `INSERT`/`SELECT`/`DELETE` se mantienen. |
| `requestSync` actual | Se reemplaza por `SyncManager.schedule()`. El `immediate: true` se elimina de todos los call sites. |
| `NetInfo` | Se sigue usando solo como detector de conectividad absoluta (sí/no). |
| SQLite | Nueva tabla `sync_state` para persistir ventana de intentos y contador de backoff. |

### API

Sin cambios.

### Shared

Sin cambios.

## Diseño

### `SyncManager`

```text
SyncManager
├── schedule()             // encolar sync (nunca bloquea)
├── processOutbox()        // iterar items pendientes
├── recordAttempt(success) // registrar en ventana deslizante
├── evaluateConnection()   // "stable" | "unstable" | "none"
│     └── successRate = éxitos / total en ventana
├── getBackoffInterval()   // según tasa y contador de fallos
└── start() / stop()       // ciclo de vida

SyncState (SQLite)
├── window: JSON array de { success: boolean }[]
├── consecutive_failures: number
├── consecutive_successes: number
└── last_attempt_at: ISO string
```

### Eliminación de bloqueo en call sites

Antes:
```typescript
// visita-receta-screen.tsx:489
await requestSync({ forceRefresh: true, immediate: true });
```

Después:
```typescript
// Guardado local instantáneo, sync en background
visitaRecetasService.save(visitaId, data);
syncManager.schedule();  // no await, no bloquea
```

### Indicador visual

Componente `SyncStatusIndicator` reutilizable:
- **Verde** ✓ : todos los items sincronizados
- **Ámbar** ⟳ : sincronización en curso
- **Gris** ⚠ : hay items pendientes, sync en backoff
- No se muestra si el outbox está vacío

## Migración y rollback

### Avance

1. Crear tabla `sync_state` en SQLite.
2. Implementar `SyncManager`.
3. Migrar call sites uno por uno: eliminar `immediate: true` y reemplazar por
   `syncManager.schedule()`.
4. Agregar `SyncStatusIndicator` en pantallas principales.

### Rollback

- Revertir call sites a `requestSync({ immediate: true })`.
- La tabla `sync_state` puede permanecer (no afecta si no se consulta).

## Criterios de aceptación

- [x] CA-001: Guardar una receta completa no requiere esperar al sync remoto.
  El guardado en SQLite es instantáneo y el usuario puede seguir trabajando.
- [x] CA-002: En red ESTABLE (tasa ≥ 70%), los datos se sincronizan en menos de
  60 segundos tras el guardado.
- [x] CA-003: En red INESTABLE (tasa < 70%), el sync aplica backoff y no
  bloquea la UI. El usuario ve el indicador "pendiente".
- [x] CA-004: Una red lenta pero confiable (ej: latencia 8s, 100% éxito) se
  clasifica como ESTABLE y sincroniza normalmente.
- [x] CA-005: Tras 3 fallos consecutivos, el intervalo entre reintentos es al
  menos 15s.
- [x] CA-006: Tras 3 éxitos consecutivos desde estado INESTABLE, se restaura a
  ESTABLE.
- [x] CA-007: Con el outbox vacío, no se muestran indicadores de sync.
- [x] CA-008: Al abrir la app después de un cierre, el estado de backoff
  previo se conserva (no parte de cero).

## Pruebas

- **Unitarias**:
  - `evaluateConnection()` con distintas ventanas (100% éxito, 50%, 0%).
  - `getBackoffInterval()` según tasa y contador.
  - `recordAttempt()` actualiza correctamente la ventana y los contadores.
- **Integración**:
  - Guardar receta → verificar que SQLite tiene el registro → verificar que
    `syncManager.schedule()` fue llamado sin `await`.
  - Simular fallos de red → verificar backoff creciente.
  - Simular recuperación → verificar restauración a ESTABLE.
- **Offline-online**:
  - Guardar sin conexión, reconectar, verificar sync automático.
  - Red intermitente (50% pérdida simulada) → verificar que la UI nunca se
    bloquea.
- **Validación manual**:
  - Con throttling de red (Chrome DevTools / Charles Proxy) a 2G, verificar que
    el guardado local es instantáneo y el sync ocurre en background.
  - Apagar WiFi a mitad de sync, verificar backoff y recuperación.

## Impacto documental

- [x] Arquitectura — actualizar `docs/architecture/` con el flujo de sync
  adaptativo.
- [x] Dominio — sin cambios.
- [x] Runbook — agregar diagnóstico de estado de sync (`sync_state`).
- [x] ADR — crear ADR para la decisión de tasa de éxito vs timeout fijo.
- [x] Variables o despliegue — sin cambios.
