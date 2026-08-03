---
title: Compatibilidad de Home con tablas de sync sin updated_at
status: implemented
numero: 028
area: mobile, sqlite, sync, home
created: 2026-08-03
approved_by: usuario, 2026-08-03
implemented_in: apps/mobile/src/shared/sync/sync-status.ts, 2026-08-03
---

# Spec 028: Compatibilidad de Home con tablas de sync sin updated_at

## Contexto

`HomeScreen` carga el detalle de errores mediante `getSyncErrorDetails()`. Esa
función recorre todas las entidades registradas para sync y selecciona
`updated_at` de manera incondicional. Las cachés `ingredientes_activos`,
`fertilizantes` y `marcas_producto` tienen `sync_status` y
`sync_error_message`, pero no una columna `updated_at`. SQLite rechaza la
consulta con `no such column: updated_at` y Home no puede renderizar.

La ausencia de la columna es válida para estas cachés y no debe corregirse
alterando tablas instaladas ni eliminando datos locales.

## Alcance

### Incluido

- Detectar mediante `PRAGMA table_info` si cada tabla posee `updated_at`.
- Seleccionar `updated_at` cuando existe y `NULL AS updated_at` cuando no.
- Ordenar primero por fecha solo en tablas que tengan esa columna y conservar
  orden determinista por identificador en todos los casos.
- Agregar una prueba que represente cachés de catálogo sin `updated_at`.
- Documentar la compatibilidad del diagnóstico de sync.

### Excluido

- Agregar columnas o migraciones SQLite.
- Cambiar payloads, outbox, handlers, API o PostgreSQL.
- Borrar cachés, pendientes o fallos de sincronización.

## Requisitos

- RF-001: Home debe cargar el estado de sync aunque una entidad registrada no
  tenga `updated_at`.
- RF-002: Los errores de tablas con `updated_at` deben conservar su fecha y
  orden descendente.
- RF-003: Los errores de tablas sin `updated_at` deben exponer `updatedAt: null`
  y ordenarse por identificador.
- RNF-001: La corrección debe ser compatible con bases existentes y nuevas sin
  migración destructiva.
- RNF-002: La consulta debe seguir usando nombres de tablas y columnas del mapa
  interno, nunca entrada de usuario.

## Contratos afectados

- Mobile interno: `SyncErrorDetail.updatedAt` ya acepta `string | null`; no
  cambia su tipo público.
- SQLite: sin cambio de esquema ni versión de migración.
- API, PostgreSQL y contratos compartidos: sin cambios.

## Seguridad y datos

- No se procesan secretos ni datos personales adicionales.
- No se borra ni reescribe información offline.
- Las tablas consultadas provienen de `SYNC_ENTITY_TABLES`, no de entrada
  dinámica externa.

## Migración y rollback

- Avance: desplegar la corrección JavaScript; funciona sobre SQLite ya
  instalada y sobre esquemas vacíos.
- Verificación: ejecutar la prueba con una tabla de catálogo sin `updated_at` y
  comprobar que el resultado usa fecha nula.
- Rollback: revertir el cambio de consulta. No existe rollback SQL porque no se
  modifica el esquema.

## Criterios de aceptación

- [x] CA-001: `getSyncErrorDetails()` no consulta directamente una columna
      inexistente en `ingredientes_activos`, `fertilizantes` o `marcas_producto`.
- [x] CA-002: Home deja de lanzar `no such column: updated_at` al cargar.
- [x] CA-003: Una entidad con `updated_at` conserva ese valor en el detalle.
- [x] CA-004: Una entidad sin `updated_at` devuelve `updatedAt: null`.
- [x] CA-005: No se agrega migración y no se pierden pendientes ni fallos.

## Pruebas

- Unitaria de `getSyncErrorDetails()` con columnas diferentes por tabla.
- Regresión de `sync-status` y suite de sync mobile.
- Typecheck, lint del alcance, build/export y `git diff --check`.
- Validación manual de apertura de Home sobre una instalación actualizada por
  OTA.

## Impacto documental

- [x] Arquitectura: registrar que el diagnóstico tolera cachés sin timestamp.
- [x] Dominio: no cambia.
- [x] Runbook: no cambia.
- [x] ADR: no se requiere.
- [x] Variables o despliegue: no agrega variables; compatible con OTA.

## Evidencia de implementación

- `sync-status.test.ts`: 2 pruebas pasan, incluida la regresión con catálogo
  sin `local_id` ni `updated_at` y visita con timestamp.
- Typecheck mobile, ESLint del alcance y Prettier: correctos.
- Export Android: correcto.
- Suite `apps/mobile/src/shared/sync`: 47/49 pruebas pasan. Los dos fallos de
  `sync-offline-online.test.ts` son deuda previa registrada: esperan 7
  procesados y reciben 6 procesados + 1 omitido; este cambio no toca el motor.
- Pendiente operativo: confirmar la apertura de Home en el dispositivo después
  de distribuir la corrección OTA.
