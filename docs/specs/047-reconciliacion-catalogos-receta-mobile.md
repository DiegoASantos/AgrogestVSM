---
title: Reconciliacion de catalogos de receta en mobile
status: implemented
numero: "047"
area: mobile, sqlite, sync, recetas, catalogos
created: 2026-08-17
approved_by: usuario, 2026-08-17
implemented_in: apps/mobile/src/shared/database/seed-catalogs.ts y docs/architecture/mobile-offline-sync.md, 2026-08-17
---

# Spec 047: Reconciliacion de catalogos de receta en mobile

## Contexto

Los catalogos de ingredientes activos, marcas comerciales y fertilizantes son
globales para todos los agronomos. En algunos dispositivos existen altas
locales `pending` o `error`; la descarga solo actualiza filas `synced` y busca
coincidencias por `server_id`. Ademas, una marca descargada conserva el ID
remoto de su ingrediente aunque SQLite pueda mantener un UUID local para la
misma identidad. El selector compara IDs locales y oculta productos validos.

## Alcance

### Incluido

- Reconciliar catalogos confirmados por la API usando `server_id` o
  `public_id`.
- Considerar la respuesta del catalogo confirmacion definitiva del alta local
  con el mismo `public_id`.
- Marcar esa fila como `synced`, limpiar su error y retirar su outbox o fallo
  durable de la sesion actual.
- Resolver el ID remoto del ingrediente de una marca al ID local canonico.
- Consolidar duplicados locales de la misma identidad sin afectar recetas.
- Conservar sin cambios altas `pending` o `error` que no existan en la API.

### Excluido

- Cambios de PostgreSQL, API o contratos HTTP.
- Filtros de catalogo por agronomo.
- Borrado masivo de pendientes o fallos no confirmados.
- Deploy u OTA.

## Requisitos

- RF-001: Todos los agronomos reciben el mismo catalogo activo de receta.
- RF-002: Una fila remota coincide primero por identidad estable
  `server_id/public_id`, no por nombre.
- RF-003: Una coincidencia remota confirma la fila local y elimina solo su
  metadata de sync para la sesion autenticada.
- RF-004: Una marca descargada debe referenciar el ID local canonico de su
  ingrediente.
- RF-005: Los pendientes y errores sin coincidencia remota se preservan y
  permanecen recuperables.
- RNF-001: La correccion no cambia SQLite ni requiere migracion nativa.
- RNF-002: La descarga completa permanece transaccional e idempotente.
- RNF-003: No se pierden altas offline no confirmadas.

## Contratos afectados

- API: sin cambios; reutiliza `id`, `publicId` e `ingredienteActivoId`.
- SQLite: sin cambio de esquema; cambia la reconciliacion de
  `ingredientes_activos`, `marcas_producto`, `fertilizantes`, `sync_outbox` y
  `sync_failures`.
- UI: los selectores siguen usando IDs locales coherentes.

## Seguridad y datos

La confirmacion exige una identidad estable devuelta por la API autenticada.
No se reconcilia por nombre. La limpieza de outbox y fallos se limita al
usuario de la sesion actual y a la entidad confirmada.

## Migracion y rollback

Avance mediante OTA compatible, sin migracion SQLite. La primera descarga
posterior reconcilia filas confirmadas y conserva las no confirmadas. Rollback:
revertir la OTA; no se reconstruyen pendientes ya confirmados porque su copia
remota es la fuente autoritativa y conserva el mismo `publicId`.

## Criterios de aceptacion

- [x] CA-001: Un ingrediente local `pending/error` con `publicId` remoto queda
      `synced` sin duplicarse.
- [x] CA-002: Una marca remota usa el UUID local de su ingrediente cuando los
      IDs local y remoto difieren.
- [x] CA-003: Se limpian outbox y fallo del registro confirmado para la sesion
      actual.
- [x] CA-004: Un pendiente sin coincidencia remota permanece intacto.
- [x] CA-005: Los productos descargados aparecen en los selectores dependientes.

## Pruebas

- unitarias de coincidencia por `publicId` y `serverId`;
- reconciliacion de `pending/error` confirmado;
- remapeo ingrediente remoto a ID local;
- preservacion de pendientes sin coincidencia;
- suite mobile, lint, typecheck y build.

## Impacto documental

- [x] Arquitectura mobile offline.
- [x] Dominio: no cambia.
- [x] Runbook: no cambia.
- [x] ADR: no corresponde.
- [x] Variables o despliegue: OTA compatible, sin variables nuevas.
