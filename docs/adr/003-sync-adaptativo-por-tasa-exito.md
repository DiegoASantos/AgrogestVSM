---
title: Sync adaptativo por tasa de exito
status: accepted
date: 2026-07-05
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
  refresh puede forzar una nueva corrida.

## Verificacion

- Pruebas unitarias de `SyncManager` para tasa de exito, backoff y recuperacion.
- Pruebas de migracion SQLite para crear `sync_state`.
- Validacion manual con red lenta y red intermitente antes de una entrega.
