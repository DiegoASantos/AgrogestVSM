# Handoff: Deficiencias nutricionales de Calcio y Fósforo

## Identificación

- fecha: 2026-08-21
- responsable: Codex
- spec o issue: Spec 065
- alcance del diff: catálogo nutricional PostgreSQL, refresco SQLite, imágenes y
  score técnico de Nutrición en API/mobile, receta y documentación canónica
- criticidad: alta

## Objetivo

Agregar Calcio y Fósforo al módulo de Nutrición de Mango, conservar los niveles
de severidad existentes, incluirlos en el score de ocho nutrientes y permitir
su uso curativo en receta sin romper datos offline.

## Cambios realizados

- migración PostgreSQL 056 idempotente con validación y rollback lógico;
- migración SQLite 68 que invalida únicamente la fecha de catálogos;
- assets WebP y referencias relativas en la pantalla de Nutrición;
- universo y fórmula del score ampliados a ocho en API y mobile;
- pruebas de migraciones, score y proyección curativa de receta;
- Spec 065, modelo de dominio, arquitectura offline e índices actualizados.

## Contratos y datos afectados

- API: misma forma; el catálogo agrega dos nutrientes y `nutritionScores` pasa
  de seis a ocho elementos.
- PostgreSQL/PostGIS: dos filas de `nutrientes` y copia de detalles activos de
  Nitrógeno para Mango mediante migración 056.
- SQLite/outbox: migración 68 elimina solo `catalogs_downloaded_at`; outbox y
  datos offline no cambian.
- autenticación y permisos: sin cambios.
- variables y despliegue: sin variables; desplegar migración/API antes de
  mobile.

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
| 5 suites focalizadas | 98 pruebas aprobadas |
| `pnpm test` | 211 archivos y 1610 pruebas aprobadas |
| typecheck API/mobile | aprobado |
| lint API/mobile | aprobado |
| build API/mobile | aprobado |
| `pnpm docs:check` | 134 documentos aprobados |
| migración 056 en PostgreSQL temporal | dos ejecuciones; 2 nutrientes y 3 detalles activos por cada uno |
| `pnpm db:smoke` | bloqueado antes de 056 por R-001 conocido |
| `git diff --check` | aprobado |

## Riesgos conocidos y exclusiones

- R-001 impide validar la cadena completa de bootstrap porque la migración 001
  usa `parcelas.sector_id`, ausente en el esquema inicial vigente.
- No se agregan fertilizantes ni se modifica el catálogo de otros cultivos.
- La migración 056 no se ejecutó contra producción.

## Instrucciones al reviewer

- revisar únicamente el alcance descrito;
- no modificar archivos;
- citar archivo y línea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
