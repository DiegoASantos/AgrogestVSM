---
title: Sincronización mobile offline
status: active
owner: mantenimiento
last_reviewed: 2026-07-12
related_code:
  - apps/mobile/src/shared/database
  - apps/mobile/src/shared/sync
  - apps/mobile/src/shared/services/api
  - apps/mobile/src/modules/auth
---

# Sincronización mobile offline

## Objetivo

Permitir que el técnico registre una visita completa sin conexión y la envíe a
la API cuando vuelva a tener conectividad.

## Flujo

1. Las pantallas escriben primero en SQLite.
2. El repositorio local agrega una operación a `sync_outbox`.
3. El motor verifica conexión y sesión.
4. La visita padre se sincroniza antes que sus entidades hijas.
5. El ID del servidor se guarda junto al ID local.
6. Se sincronizan evaluaciones, sanidad, notas, riego, labores y receta.
7. Los registros pasan a `synced`, quedan `pending` o terminan en `error`.

## Disparadores

- nueva entrada de outbox;
- recuperación de conectividad;
- aplicación activa;
- solicitud manual;
- ciclo periodico aproximado de treinta segundos cuando hay trabajo local o
  verificacion ligera.

## Calidad de red adaptativa

El sync no asume que "hay conexion" equivale a "la red sirve para sincronizar".
NetInfo solo decide desconexion absoluta. Cuando hay conexion, `SyncManager`
mantiene en SQLite una ventana reciente de intentos en `sync_state` y calcula la
tasa de exito por operaciones individuales (no por ciclo completo):

- tasa de exito mayor o igual a 70%: red estable, sync normal;
- tasa menor a 70%: red inestable, sync automatico con backoff progresivo
  (10s, 30s, 60s, 120s);
- tasa menor a 20%: intervalo minimo de 60 segundos entre reintentos
  automaticos;
- tres exitos consecutivos restauran el estado estable;
- el boton manual omite el backoff (`bypassBackoff`) sin forzar refresh de
  autenticacion.

Los guardados siguen escribiendo primero en SQLite y programan sync en segundo
plano. La UI no espera a la red para confirmar el guardado local.

## Timeouts HTTP

Todo request HTTP emitido por el cliente movil tiene un timeout explicito
cancelable via `AbortController`:

- default: 15 segundos para requests JSON normales y de sync;
- sesion/auth: 5 segundos para refresh de token;
- catalogos: heredan el default de 15s, pueden declarar uno mayor;
- las respuestas se leen hasta terminar el body, manteniendo el timeout activo.

Un timeout genera `ApiTimeoutError` (HTTP 408) clasificado como error
transitorio por el motor de sync. El `AbortSignal` se propaga a cada handler
del outbox para que el request activo se cancele al agotar el presupuesto del
ciclo.

## Presupuesto de ciclo

Cada ejecucion de sync tiene un deadline:
- manual (`Sincronizar ahora`): 30 segundos;
- automatico: 45 segundos.

Al agotarse, se aborta el request activo, se preservan las entradas no
procesadas y `isSyncing` vuelve a `false`. La UI nunca queda en
"Sincronizando..." tras el deadline.

## Sesion online

La sesion distingue tres estados:
- `online_valid`: token vigente, sync habilitado;
- `online_temporarily_unavailable`: fallo transitorio de refresh, cooldown de
  60s; token vigente usable sin HTTP; acceso offline conservado;
- `online_reauth_required`: refresh rechazado con 401/403; tokens online
  limpiados; acceso offline conservado mientras su TTL sea valido.

El login fresco resetea el backoff de red, limpia el estado de reautenticacion
y programa un sync inmediato con `bypassBackoff`.

## Reintentos y fallos durables

- los errores transitorios se reintentan hasta 5 veces;
- al agotar o recibir error permanente, la operacion se mueve de `sync_outbox`
  a `sync_failures` en una transaccion atomica, preservando tipo, payload y
  operacion (incluidos deletes);
- errores de autenticacion nunca van a `sync_failures`; detienen el ciclo
  conservando el outbox;
- `Sincronizar ahora` procesa solo `sync_outbox`; `Reintentar fallidos` es una
  accion separada que reencola solo fallos `transient` en orden padre-hijos;
- errores `permanent` permanecen visibles y requieren correccion explicita
  desde el detalle del dato;
- un error de autenticacion detiene el ciclo;
- ciertos conflictos recuperan el ID existente del servidor.

## Invariantes

- no sincronizar hijos antes de obtener el ID de la visita;
- conservar operaciones de borrado con el ID remoto necesario;
- evitar duplicar entradas equivalentes en la outbox;
- no perder datos locales por una caida de red;
- mantener idempotencia mediante IDs publicos cuando aplique;
- no considerar `synced` una entidad que no fue confirmada por la API;
- ningun fallo de red, timeout, cancelacion o auth borra datos locales;
- el estado de backoff nunca impide un sync manual con token valido;
- los catalogos se refrescan de forma independiente al push del outbox;
- las operaciones agotadas se preservan en `sync_failures` hasta reintento
  explicito o correccion del dato.

## Cambios críticos

Toda nueva entidad sincronizable requiere:

- tabla y migración SQLite;
- repositorio local;
- tipo de entidad de sync;
- handler;
- endpoint remoto;
- orden respecto de la visita;
- tratamiento create/update/delete;
- reconciliación y reintento;
- pruebas offline-online;
- actualización de este documento.
