---
title: Filtros temporales para dashboard y reportes
status: implemented
numero: 077
area: dashboard, reportes, api, admin-web
created: 2026-09-05
approved_by: Usuario, 2026-09-05
implemented_in: apps/api/src/modules/dashboard; apps/api/src/modules/reportes; apps/admin-web/src/modules/dashboard; apps/admin-web/src/modules/reportes; docs/architecture/overview.md; docs/domain/data-model.md; docs/operations/security-baseline.md
---

# Spec 077: Filtros temporales para dashboard y reportes

## Contexto

El dashboard solo permitía escoger un año fijo para visitas mensuales. Los
reportes Campos por etapas y Parcelas no podían limitar su universo a un
periodo operativo.

## Alcance

### Incluido

- Filtro en cascada de año, mes y día para visitas, plagas, nutrientes y
  enfermedades del dashboard.
- Gráfico de enfermedades frecuentes desde observaciones sanitarias.
- Rango inclusivo, obligatorio e iniciado en el mes actual para Campos por
  etapas y Parcelas.

### Excluido

- Migraciones, cambios mobile, permisos nuevos o rutas nuevas.
- Filtrar KPI, actividad reciente, ranking, campañas o gráficos con filtros
  propios del dashboard.

## Requisitos

- RF-001: Año actual por defecto; mes y día opcionales; día exige mes y se
  valida contra el calendario.
- RF-002: Los cuatro gráficos temporales usan visitas activas del periodo.
  Plagas y enfermedades devuelven hasta diez incidencias; nutrientes conserva
  el top tres. Visitas se agrupa por mes al elegir solo año y por día al
  elegir un mes.
- RF-003: Campos por etapas selecciona la última visita activa por parcela
  dentro del rango, con desempate por ID.
- RF-004: Parcelas incluye solo parcelas con una visita activa dentro del
  rango, pero conserva el ingeniero de asignación actual.
- RF-005: Web y API validan ambas fechas y `fecha_desde <= fecha_hasta`.

## Contratos afectados

- `GET /dashboard/resumen` acepta `year`, `month` y `day`; devuelve
  `availableYears` y `charts.enfermedadesFrecuentes`.
- `GET /reportes/campos-por-etapas` y `GET /reportes/parcelas` requieren
  `fecha_desde` y `fecha_hasta` ISO, junto con sus filtros actuales.

## Seguridad y datos

Se conservan guards y roles. Las consultas son parametrizadas y excluyen visitas
inactivas; no se añaden datos sensibles a las respuestas.

## Migración y rollback

No hay migración. API y web se despliegan en conjunto por las fechas requeridas
en los reportes. El rollback restaura el contrato previo y la vista sin filtros.

## Criterios de aceptación

- [x] Los filtros actualizan los cuatro gráficos definidos del dashboard.
- [x] Se visualizan enfermedades frecuentes para el periodo aplicado.
- [x] Ambos reportes inician en el mes actual y aplican su rango a agregados,
      mapas y gráficos.
- [x] Los rangos inválidos se rechazan sin consultar.

## Pruebas

- Unitarias de serialización web, filtros temporales, enfermedades y rangos.
- Typecheck y lint de API y admin web.

## Impacto documental

- [x] Arquitectura, dominio, seguridad y especificación actualizados.
- [x] Sin ADR, variables, migración ni cambios de runbook.
