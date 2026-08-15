---
title: Evapotranspiracion y radiacion diaria en clima mobile
status: implemented
numero: 040
area: clima, api, mobile, open-meteo, weatherlink
created: 2026-08-15
approved_by: usuario mediante instruccion "Implement the plan", 2026-08-15
implemented_in: working tree, 2026-08-15
---

# Spec 040: Evapotranspiracion y radiacion diaria en clima mobile

## Contexto

Open-Meteo ya entrega ET0 diaria en mobile y WeatherLink normaliza lecturas de
ET y radiacion cuando la Davis dispone de sensores. Falta completar la
radiacion de Open-Meteo y exponer ambas variables en el resumen diario Davis.

## Alcance

### Incluido

- Radiacion diaria acumulada de Open-Meteo para hoy y pronostico.
- Total diario de evapotranspiracion y promedio diario de radiacion Davis.
- Visualizacion mobile con unidades explicitas y ausencia como `—`.
- Compatibilidad con caches JSON anteriores.

### Excluido

- Cambios visuales en admin web.
- Persistencia de lecturas WeatherLink en PostgreSQL.
- Alertas o recomendaciones derivadas de estas variables.
- Migraciones SQLite o PostgreSQL.

## Requisitos

- RF-001: Open-Meteo debe solicitar y mapear `shortwave_radiation_sum` en
  `MJ/m2` junto con la ET0 diaria en `mm`.
- RF-002: El resumen Davis debe sumar ET en `mm` y promediar radiacion en
  `W/m2` por dia consultado.
- RF-003: Mobile debe mostrar las nuevas variables en cada resumen diario.
- RF-004: Una variable ausente debe mostrarse como no disponible, nunca cero.
- RNF-001: El contrato debe ser aditivo y tolerar API o cache anteriores.

## Contratos afectados

- `DistrictClimateResponse.field` agrega `solarRadiationTodayMjM2`.
- Cada elemento de `forecast` agrega `solarRadiationMjM2`.
- `WeatherLinkDailySummary` agrega `evapotranspirationTotalMm` y
  `solarRadiationAverageWm2`.
- No cambia ningun endpoint ni permiso.

## Seguridad y datos

- Las credenciales WeatherLink siguen exclusivamente en API.
- No se exponen payloads crudos, secretos ni identificadores tecnicos nuevos.

## Migracion y rollback

- Desplegar API antes del OTA mobile.
- Caches antiguas omiten campos y mobile muestra `—`.
- Rollback de API/mobile sin cambios de datos.

## Criterios de aceptacion

- [x] CA-001: Open-Meteo muestra ET0 y radiacion diaria para hoy y pronostico.
- [x] CA-002: Davis muestra ET total y radiacion promedio por dia.
- [x] CA-003: Una Davis sin sensor muestra `—` sin error.
- [x] CA-004: Una cache anterior sigue siendo legible.
- [x] CA-005: Admin web conserva su comportamiento actual.

## Pruebas

- API Open-Meteo: query, mapeo, unidades y valores ausentes.
- API WeatherLink: suma, promedio, redondeo y ausencia de sensores.
- Mobile: contratos, render de resumen y cache anterior.
- Lint, typecheck, tests y build de API/mobile.

Evidencia ejecutada el 2026-08-15: lint y build de API/mobile, suite completa de
1374 pruebas, casos de mapeo Open-Meteo, resumen Davis, sensores ausentes y
cache anterior, `docs:check` y `git diff --check`.

## Impacto documental

- [x] Arquitectura y dominio de clima.
- [x] Runbook: orden de despliegue API antes de OTA.
- [x] ADR: no aplica.
- [x] Variables: no cambia.
