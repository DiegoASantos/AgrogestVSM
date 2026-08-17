---
title: Conectividad hibrida y modo offline controlado en mobile
status: implemented
numero: "045"
area: mobile-sync
created: 2026-08-17
approved_by: Usuario via Codex, 2026-08-17
implemented_in: apps/mobile/src/shared/connectivity; apps/mobile/src/shared/services/api/client.ts; apps/mobile/src/shared/sync; apps/mobile/src/modules/home/presentation/screens/home-screen.tsx; docs/adr/004-conectividad-efectiva-mobile.md
---

# Spec 045: Conectividad hibrida y modo offline controlado en mobile

## Contexto

NetInfo puede informar conectividad mientras la latencia, los timeouts o los
fallos intermitentes hacen que las consultas remotas ralenticen la experiencia.
El sync ya aplica backoff por tasa de exito, pero Inicio sigue mostrando
`Online` y los demas consumidores pueden continuar intentando usar la red.

## Alcance

### Incluido

- separar conectividad fisica, calidad observada, preferencia del usuario y
  modo efectivo de trabajo;
- degradacion automatica a trabajo offline ante red lenta o inestable;
- seleccion persistente de modo offline desde Inicio;
- pausa de sync, catalogos, clima remoto y OTA en modo offline efectivo;
- excepcion explicita para login y sondeos controlados de recuperacion;
- diagnostico visible y no bloqueante en Inicio y pantallas mobile.

### Excluido

- tests de velocidad o medicion de ancho de banda;
- cambios en endpoints, DTOs, PostgreSQL o esquema SQLite;
- un modo que fuerce permanentemente requests sobre una red diagnosticada como
  inestable;
- cambios al orden, payload o reconciliacion del outbox.

## Requisitos

- RF-001: mobile distinguira conectividad fisica, calidad `checking`, `stable`,
  `unstable` o `none`, preferencia `automatic` u `offline` y modo efectivo
  `online`, `offline_auto` u `offline_manual`.
- RF-002: una observacion sera mala ante timeout, fallo de transporte, respuesta
  HTTP 5xx o duracion mayor o igual a 5 segundos. Los 4xx probaran que el
  transporte responde y no degradaran por si solos la red.
- RF-003: el modo automatico se degradara tras dos observaciones malas
  consecutivas o una tasa menor a 70% con al menos tres observaciones. Tres
  observaciones buenas consecutivas restauraran el estado estable.
- RF-004: la perdida fisica de Internet activara `none` inmediatamente sin
  borrar ni modificar datos locales.
- RF-005: el modo offline manual se persistira por usuario autenticado hasta
  que ese usuario vuelva a automatico. Otro usuario empezara en automatico.
- RF-006: en modo offline efectivo las requests normales se rechazaran antes de
  `fetch`; login seguira permitido con conectividad fisica y los sondeos solo
  se permitiran en modo automatico degradado.
- RF-007: en `offline_auto`, con la app activa, `/health` se consultara cada 30
  segundos con timeout de 5 segundos. No habra sondeos en `offline_manual`.
- RF-008: `Probar conexion ahora` ejecutara un sondeo explicito; un resultado
  rapido habilitara online y programara sync, mientras un fallo conservara el
  modo offline y los pendientes.
- RF-009: Inicio permitira escoger `Modo automatico` o `Trabajar offline` y
  mostrara el origen del estado mediante tarjeta y franja persistente.
- RF-010: clima usara cache y sync, catalogos y OTA permaneceran pausados en
  modo offline efectivo.
- RNF-001: ningun cambio de modo alterara `sync_outbox`, `sync_failures`, IDs,
  payloads, estados de entidades ni orden padre-hijos.
- RNF-002: el estado historico de `sync_state` sin duraciones seguira siendo
  legible y `app_meta` evitara una migracion SQLite.
- RNF-003: los sondeos no incluiran token, PII ni payload de negocio y se
  detendran con la app en segundo plano.
- RNF-004: mensajes y controles seran accesibles, en espanol y no bloquearan la
  navegacion ni el guardado local.

## Contratos afectados

- API: sin cambios; se reutiliza `GET /health` publico.
- Mobile TypeScript: nuevos tipos de conectividad y politica de request
  `standard | essential | probe`.
- SQLite: sin migracion; preferencia por usuario en `app_meta` y duracion
  opcional compatible dentro de `sync_state.window_json`.

## Seguridad y datos

El login es la unica operacion esencial autorizada desde modo offline manual y
solo se intenta si NetInfo informa conectividad fisica. Los sondeos usan el
health publico y no transmiten identidad. El bloqueo de UI no sustituye la
autorizacion de la API.

## Migracion y rollback

No existe migracion. Versiones anteriores ignoran las nuevas claves de
`app_meta` y los campos opcionales del JSON. El rollback elimina el proveedor y
restaura el uso directo de NetInfo; outbox y datos locales permanecen intactos.

## Criterios de aceptacion

- [x] CA-001: dos resultados malos consecutivos activan offline automatico y
      tres buenos restauran online sin oscilacion por un unico resultado.
- [x] CA-002: offline manual sobrevive al reinicio, se aisla por usuario y solo
      termina por accion explicita.
- [x] CA-003: guardar una visita en cualquier modo offline conserva una sola
      operacion recuperable y sincroniza padre-hijos al volver online.
- [x] CA-004: requests normales no llegan a `fetch` en offline efectivo; login
      y health respetan sus excepciones.
- [x] CA-005: Inicio y la franja global identifican estable, inestable, offline
      manual y sin Internet con acciones coherentes.
- [x] CA-006: clima usa cache y no se ejecutan pull de catalogos ni OTA en
      offline efectivo.
- [x] CA-007: lint, tipos, pruebas focalizadas y offline-online quedan verdes.

## Pruebas

- unitarias del gestor de calidad, politica HTTP y preferencia por usuario;
- componentes/estado de presentacion de la tarjeta y franjas;
- integracion de sync, timeout, reinicio y recuperacion;
- validacion manual Android con red limitada e intermitente.

## Impacto documental

- [x] Arquitectura mobile offline.
- [x] ADR de conectividad efectiva.
- [x] Registro de riesgos.
- [x] Indices de specs y documentacion.
