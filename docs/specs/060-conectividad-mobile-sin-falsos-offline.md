---
title: Conectividad mobile sin falsos cambios a offline
status: implemented
numero: "060"
area: mobile-sync
created: 2026-08-19
approved_by: Usuario via Codex, 2026-08-19
implemented_in: apps/mobile/src/shared/services/api/client.ts; apps/mobile/src/shared/sync/sync-manager.ts; docs/adr/005-calidad-conectividad-por-alcance-http.md
---

# Spec 060: Conectividad mobile sin falsos cambios a offline

## Contexto

El modo automatico puede degradarse a `offline_auto` aun cuando el dispositivo
mantiene una conexion util. La telemetria actual confunde respuestas HTTP lentas,
errores 5xx del servidor y cancelaciones iniciadas por la propia aplicacion con
fallos de conectividad. Ademas, una ventana degradada persiste indefinidamente en
`sync_state` y puede reutilizarse al volver a abrir la app.

## Alcance

### Incluido

- distinguir alcance HTTP de timeout o fallo de transporte;
- ignorar cancelaciones iniciadas por la aplicacion en la calidad de conexion;
- evitar que una respuesta lenta o 5xx active por si misma `offline_auto`;
- caducar el diagnostico persistido cuando no tiene observaciones recientes;
- conservar la degradacion automatica ante fallos reales y repetidos de red.

### Excluido

- cambios de esquema SQLite, outbox, payloads o handlers de sync;
- cambios en endpoints o contratos de la API;
- eliminar el modo offline manual o la recuperacion mediante `/health`;
- pruebas de velocidad o sondeos previos a cada request.

## Requisitos

- RF-001: toda respuesta HTTP recibida confirmara alcance del servidor, sin
  importar su estado o una duracion mayor a cinco segundos.
- RF-002: un timeout del cliente o un fallo de transporte contara como
  observacion mala y conservara los umbrales existentes de degradacion.
- RF-003: una cancelacion solicitada mediante `AbortSignal` por la aplicacion no
  agregara una observacion buena ni mala.
- RF-004: una ventana persistida con cinco minutos o mas sin actividad no
  determinara la calidad actual ni mantendra el modo automatico en offline.
- RF-005: NetInfo seguira activando `none` inmediatamente cuando no exista
  conectividad fisica y `/health` seguira recuperando `offline_auto`.
- RNF-001: el cambio no modificara datos operativos, IDs, orden padre-hijos,
  idempotencia, outbox ni fallos durables.
- RNF-002: el JSON historico de `sync_state` seguira siendo compatible y no
  requerira una migracion SQLite.

## Contratos afectados

Solo cambia la semantica interna de `NetworkObservation` y del historial de
calidad en mobile. No cambia el contrato HTTP, PostgreSQL, SQLite ni tipos
compartidos entre aplicaciones.

## Seguridad y datos

La telemetria mantiene solo resultado, duracion, politica y fecha; no incorpora
token, PII ni payloads de negocio. Las reglas de autenticacion no cambian.

## Migracion y rollback

No existe migracion. El JSON persistido anterior sigue siendo legible; al
caducar se ignora hasta la siguiente observacion, que vuelve a guardar el mismo
formato. El rollback consiste en revertir codigo y documentacion mobile.

## Criterios de aceptacion

- [x] CA-001: dos respuestas exitosas lentas no cambian a `offline_auto`.
- [x] CA-002: respuestas HTTP 5xx no se clasifican como perdida de conexion.
- [x] CA-003: una cancelacion interna no degrada la calidad.
- [x] CA-004: dos timeouts o fallos de transporte consecutivos mantienen la
      degradacion automatica existente.
- [x] CA-005: un historial degradado de cinco minutos o mas inicia estable.
- [x] CA-006: las pruebas y validaciones estaticas mobile pasan.

## Pruebas

- unitarias del cliente HTTP y `SyncManager`;
- regresion de timeout, respuesta lenta, 5xx y cancelacion;
- verificacion de compatibilidad con el flujo offline-online existente;
- validacion manual recomendada al preparar el siguiente build Android.

## Impacto documental

- [x] Arquitectura.
- [ ] Dominio.
- [x] Runbook.
- [x] ADR.
- [ ] Variables o despliegue.
