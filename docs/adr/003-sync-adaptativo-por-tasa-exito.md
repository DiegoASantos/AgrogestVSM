---
title: Sync adaptativo por tasa de exito
status: accepted
date: 2026-07-05
last_reviewed: 2026-07-12
decision_makers:
  - mantenimiento
supersedes:
superseded_by:
---

# ADR-003: Sync adaptativo por tasa de exito

## Contexto

La aplicacion mobile trabaja en zonas rurales donde NetInfo puede reportar
conexion aunque la red falle de forma intermitente. Un timeout fijo penaliza
redes lentas pero confiables y no describe bien la calidad real de la conexion.

## Decision

El sync mobile clasifica la calidad de red por tasa de exito en una ventana
reciente de intentos. Si la tasa es estable, el outbox se procesa normalmente.
Si cae por debajo del umbral, se aplica backoff adaptativo antes de nuevos
intentos automaticos. NetInfo queda limitado a detectar desconexion absoluta.

## Alternativas consideradas

- Sincronizar siempre que NetInfo reporte conexion.
- Usar un timeout artificial corto para marcar la red como mala.
- Medir latencia promedio.

## Consecuencias

### Positivas

- Las redes lentas pero confiables siguen sincronizando.
- Los guardados locales no esperan al sync remoto.
- La app reduce intentos automaticos cuando la red es intermitente.

### Negativas y riesgos

- El estado de backoff agrega una tabla local `sync_state`.
- Un fallo clasificado como transitorio puede retrasar intentos automaticos
  aunque el usuario ya haya recuperado buena red; el reintento manual con
  `bypassBackoff` fuerza una nueva corrida sin necesidad de refresh de sesion.

## Precisiones de Spec 015 (2026-07-12)

- La medicion de tasa de exito cambio de booleana por ciclo a granular por
  operacion (`recordOutcome(successes, failures)`). Los skips por dependencia y
  errores permanentes no contaminan la metrica de calidad de red.
- Se agregaron timeouts HTTP explicitos (15s default, 5s auth) con
  `AbortController` en lugar de depender del timeout natural de la plataforma.
- Se introdujo presupuesto de tiempo por ciclo: 30s manual, 45s automatico.
- Se separo `bypassBackoff` de `forceAuthRefresh` en las opciones de sync.
- Se agrego la tabla `sync_failures` para preservar operaciones agotadas.
- Los intervalos de backoff se ajustaron a `[10s, 30s, 60s, 120s]` con minimo
  severo de 60s.
- Login fresco resetea backoff y programa sync inmediato.

## Verificacion

- Pruebas unitarias de `SyncManager` para tasa de exito, `recordOutcome`, backoff
  y recuperacion.
- Pruebas de migracion SQLite para crear `sync_state` y `sync_failures`.
- Pruebas de integracion offline-online con deadlines, timeouts y fallos durables.
- Validacion manual con red lenta, red intermitente y reconexion.
