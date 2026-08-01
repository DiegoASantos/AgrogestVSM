# Handoff: reparación y recarga de concentraciones en receta mobile

## Identificación

- fecha: 2026-08-01
- responsable: Codex
- spec o issue: spec 025
- alcance del diff: migraciones PostgreSQL 037/038, validación del runner, migración SQLite 50, recarga de catálogos en receta mobile y documentación asociada
- criticidad: alta

## Objetivo

Corregir el caso en que una marca comercial ya seleccionada no muestra su
concentración. La reparación debe completar concentración y unidad en PostgreSQL
sin depender de joins de catálogo, forzar una descarga nueva en mobile y
rehidratar la selección de una receta que ya está abierta.

## Cambios realizados

- `037-concentraciones-unidades-receta.ts`: separa la actualización de datos
  comerciales de la resolución opcional de relaciones.
- `038-reparar-concentraciones-unidades-receta.ts`: reaplica el único SQL fuente
  para reparar bases que ya registraron 037.
- `migrate-database.ts`: valida cantidades mínimas de filas completas.
- `migrations.ts` mobile: versión 50 invalida solo la marca temporal de descarga.
- pantalla y selección de receta: releen SQLite tras una descarga exitosa y
  completan concentración/unidad de la selección actual.
- spec 025 e índice/arquitectura: registran compatibilidad, despliegue y rollback.

## Contratos y datos afectados

- API: sin cambio de endpoint ni DTO respecto de la spec 024.
- PostgreSQL/PostGIS: nuevo registro idempotente 038; actualiza catálogos por
  nombre normalizado y no crea una segunda definición de datos.
- SQLite/outbox: versión 50 elimina solo `catalogs_downloaded_at`; no modifica
  recetas ni outbox.
- autenticación y permisos: sin cambios.
- variables y despliegue: sin variables nuevas; desplegar API antes que mobile.

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
| typecheck API | aprobado |
| typecheck mobile | aprobado |
| lint API | aprobado |
| ESLint de archivos mobile cambiados | aprobado |
| pruebas focalizadas (5 archivos, 38 pruebas) | aprobado |
| build API | aprobado |
| build mobile | aprobado |
| `git diff --check` | aprobado; advertencias de fin de línea del entorno |
| suite completa | 95 archivos aprobados y 1 fallo preexistente/no relacionado en `sync-offline-online.test.ts` (2 aserciones) |

## Riesgos conocidos y exclusiones

- No se operó ni modificó manualmente producción.
- La corrección requiere desplegar API y luego distribuir la versión mobile.
- El endpoint protegido de catálogo no se consultó sin credenciales; el health
  público confirmó que el commit anterior estaba desplegado y sano.
- Permanecen dos fallos previos de conteo `processed/skipped` en la prueba global
  de sincronización, fuera del alcance de esta corrección.

## Instrucciones al reviewer

- revisar únicamente el alcance descrito;
- no modificar archivos;
- citar archivo y línea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
