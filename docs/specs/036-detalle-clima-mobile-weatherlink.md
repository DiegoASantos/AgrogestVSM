---
title: Detalle de clima móvil y estaciones WeatherLink
status: implemented
numero: 036
area: clima, mobile, sqlite, ui-ux
created: 2026-08-12
approved_by: usuario mediante instrucción "Implement the plan", 2026-08-12
implemented_in: apps/mobile/app/clima/detalle.tsx; apps/mobile/src/modules/clima; apps/mobile/src/shared/database
amended_by: docs/specs/037-consulta-directa-weatherlink.md
---

# Spec 036: Detalle de clima móvil y estaciones WeatherLink

> La consulta por rango y el resumen diario Davis fueron agregados por la Spec
> 037. Las exclusiones de historial de esta spec describen solo su entrega
> original.

## Contexto

Inicio móvil presenta la estimación territorial en un espacio limitado. La API
ya conserva estaciones Davis de WeatherLink y sus últimas lecturas, pero estas
no son visibles en móvil ni pueden consultarse sin conexión tras una lectura
previa.

## Alcance

### Incluido

- Inicio conserva el selector de Tambogrande, Las Lomas, Motupe y Casma y
  reduce su subtítulo a “Estimación meteorológica”.
- Inicio agrega el control accesible “Ver más” con flecha hacia la derecha.
- Nueva vista móvil con pestañas Estimación y Estación Davis.
- Estimación conserva selector de los cuatro distritos, variables de campo,
  pronóstico de siete días y el aviso explícito de estimación territorial.
- Estación Davis usa selector independiente por estación WeatherLink activa y
  muestra únicamente la última lectura disponible por variable y su vigencia.
- Caché SQLite de solo lectura por estación y persistencia de la estación
  seleccionada, sin outbox.

### Excluido

- Historial, gráficos o rango de fechas configurable para Davis.
- Selección de estación por distrito, geodatos nuevos, alertas o recomendaciones.
- Cambios en WeatherLink, credenciales, permisos o contratos HTTP de API.

## Requisitos

- RF-001: los cuatro distritos aprobados se mantienen en el orden actual y se
  usan solo para la estimación territorial de Open-Meteo.
- RF-002: la pestaña Davis muestra exclusivamente estaciones activas con fuente
  `weatherlink`, seleccionables por estación.
- RF-003: ante desconexión o fallo remoto, la app muestra la última consulta
  Davis guardada, indicando si está vencida; sin caché muestra un estado vacío.
- RF-004: el caché Davis no crea entradas en `sync_outbox` ni modifica datos de
  campo.
- RNF-001: pestañas y selectores son accesibles, tienen área táctil mínima de
  44 pt y distinguen visualmente estimación de observación.

## Contratos afectados

- Mobile consume sin cambios `GET /clima/estaciones`, autenticado para
  `AGRONOMO` y `ADMIN`.
- SQLite agrega `clima_estacion_cache` y una clave de selección en `app_meta`.
- No se modifican API, PostgreSQL, outbox ni datos sincronizables.

## Seguridad y datos

- La app recibe únicamente metadata y lecturas persistidas por la API; las
  credenciales WeatherLink continúan fuera de mobile.
- Los datos cacheados son de consulta y se identifican como vencidos cuando
  corresponde.

## Migración y rollback

1. La migración SQLite 58 crea aditivamente la caché de estaciones.
2. La aplicación previa ignora la tabla nueva; la nueva aplicación puede operar
   sin caché hasta su primera consulta remota.
3. El rollback de UI deja la caché sin uso y no toca outbox ni datos operativos.

## Criterios de aceptación

- [x] CA-001: Inicio muestra “Estimación meteorológica” y “Ver más” con flecha.
- [x] CA-002: la nueva vista conserva los cuatro distritos en Estimación.
- [x] CA-003: Davis se selecciona por estación y presenta la última lectura.
- [x] CA-004: la última consulta Davis permanece legible sin conexión y avisa
      cuando está vencida.
- [x] CA-005: no se agregan operaciones al outbox.

## Pruebas

- unitarias de filtrado, caché, selección persistente y fallback offline;
- migración SQLite aditiva sin alterar outbox;
- typecheck y lint de mobile;
- validación manual de navegación, pestañas, estados vacíos y texto ampliado.

## Impacto documental

- [x] Arquitectura de cachés de consulta.
- [x] Dominio: sin cambio.
- [x] Runbook: sin cambio.
- [x] ADR: sin cambio.
- [x] Variables o despliegue: sin cambio.
