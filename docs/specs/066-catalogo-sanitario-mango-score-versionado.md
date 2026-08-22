---
title: Catálogo sanitario Mango y score técnico versionado
status: implemented
numero: "066"
area: database, api, mobile, sqlite, sync, scoring, ux
created: 2026-08-22
approved_by: usuario mediante instrucción "Implement the plan", 2026-08-22
implemented_in: "apps/api/src/database/migrations/057-catalogo-sanitario-mango-score-versionado.ts; apps/mobile/src/shared/database/migrations.ts (69)"
---

# Spec 066: Catálogo sanitario Mango y score técnico versionado

## Contexto

Mango requiere cuatro nuevas plagas y tres enfermedades. El score técnico actual
se calcula en lectura sobre un universo fijo, por lo que ampliarlo sin versión
recalcularía visitas históricas.

## Alcance

### Incluido

- Catálogo activo de Arañita roja, Mosca blanca, Gusano barrenador, Hormiga
  arriera, Fusariosis, Botritis y Fumagina para Mango.
- Incidencia y severidad grados 0 a 3 en todas las etapas y labores activas.
- Órganos obligatorios para observaciones positivas de plagas y enfermedades.
- Versión 1 histórica y versión 2 ampliada del score técnico por visita.
- Captura y previsualización offline compatibles, más imágenes locales.

### Excluido

- Recalcular, sobrescribir o borrar observaciones y scores de visitas existentes.
- Cambiar la fórmula individual `3 - MAX(incidencia, severidad)` o la regla
  especial vigente de Mosca de la fruta.

## Requisitos

- RF-001: Plagas v2 consolida las seis existentes más Arañita roja, Mosca
  blanca, Gusano barrenador y Hormiga arriera; Enfermedades v2 consolida las
  cuatro existentes más Fusariosis, Botritis y Fumagina.
- RF-002: Visitas existentes conservan versión 1; las nuevas creadas tras el
  despliegue usan versión 2 y no cambian de versión al editarse.
- RF-003: Plagas seleccionan incidencia manual; enfermedades derivan incidencia
  desde porcentaje 0, 1–5, 6–20 y 21–100. Con incidencia positiva ambas exigen
  severidad y al menos un órgano afectado.
- RNF-001: PostgreSQL y SQLite son aditivos; no se recrean tablas ni se borran
  pendientes de outbox.

## Contratos afectados

- Creación y lectura de visita agregan `technicalScoreVersion` (1 o 2).
- La versión viaja dentro de la operación padre `visitas_campo`; los contratos
  de observación conservan su forma actual.

## Migración y rollback

- PostgreSQL rellena visitas existentes con versión 1 y usa valor por defecto 2
  para nuevas filas. SQLite marca visitas locales existentes como 1 y las nuevas
  como 2; además invalida la descarga de catálogos.
- El catálogo y sus relaciones se insertan o reactivan de forma idempotente.
- Despliegue: migración PostgreSQL, API compatible y finalmente OTA mobile.
- Rollback operativo: conservar versión, catálogo y relaciones; revertir código
  sin borrar datos ni recalcular históricos.

## Criterios de aceptación

- [x] CA-001: Las siete tarjetas aparecen con imagen y ocho niveles por etapa.
- [x] CA-002: v1 conserva exactamente sus universos y resultados actuales.
- [x] CA-003: v2 consolida 10 plagas y 7 enfermedades, y ausencia equivale a 3.
- [x] CA-004: Capturas positivas de ambos tipos requieren severidad y órganos.
- [x] CA-005: Una visita offline conserva versión, catálogo y score local tras
      reinicio y sincronización.

## Pruebas

- Migraciones, catálogo y cardinalidades; API y SQLite previos.
- Fórmulas v1/v2, límites de grados y porcentaje de enfermedad.
- Offline-online, reintento, reanudación y contrato de creación de visita.

## Impacto documental

- [x] Dominio y arquitectura offline.
- [x] Registro de riesgos e índice de specs.
- [x] No requiere ADR ni variables nuevas.
