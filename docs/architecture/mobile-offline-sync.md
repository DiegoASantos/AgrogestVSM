---
title: Sincronización mobile offline
status: active
owner: mantenimiento
last_reviewed: 2026-07-05
related_code:
  - apps/mobile/src/shared/database
  - apps/mobile/src/shared/sync
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
tasa de exito:

- tasa de exito mayor o igual a 70%: red estable, sync normal;
- tasa menor a 70%: red inestable, sync automatico con backoff;
- tasa menor a 20%: intervalo minimo de dos minutos entre reintentos
  automaticos;
- tres exitos consecutivos restauran el estado estable.

Los guardados siguen escribiendo primero en SQLite y programan sync en segundo
plano. La UI no espera a la red para confirmar el guardado local.

## Reintentos y conflictos

- los errores transitorios se reintentan hasta un límite;
- un error de autenticación detiene el ciclo;
- ciertos conflictos recuperan el ID existente del servidor;
- un error permanente marca la entidad y elimina la entrada agotada;
- el usuario puede solicitar reintento desde el estado local.

## Invariantes

- no sincronizar hijos antes de obtener el ID de la visita;
- conservar operaciones de borrado con el ID remoto necesario;
- evitar duplicar entradas equivalentes en la outbox;
- no perder datos locales por una caída de red;
- mantener idempotencia mediante IDs públicos cuando aplique;
- no considerar `synced` una entidad que no fue confirmada por la API.

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
