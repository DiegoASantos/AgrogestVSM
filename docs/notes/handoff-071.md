# Handoff: Opciones de poda en recomendaciones de labores culturales

## Identificacion

- fecha: 2026-09-01
- responsable: Codex
- spec o issue: Spec 071
- alcance del diff: contrato y persistencia de labores recomendadas de receta,
  selector mobile agrupado, pruebas y documentacion canonica
- criticidad: alta

## Objetivo

Corregir el texto visible de motoguadaña y agregar cuatro tipos persistibles de
poda bajo un padre visual exclusivo, conservando compatibilidad con recetas y
dispositivos offline existentes.

## Cambios realizados

- API: DTO, entidad y regla de negocio para aceptar cuatro codigos nuevos y
  rechazar mas de una poda por receta.
- PostgreSQL: migracion 059 que amplia el constraint sin modificar filas.
- Mobile: etiquetas, selector Poda desplegable, seleccion exclusiva y resumen
  legible de la receta anterior.
- SQLite: esquema fresco y migracion 71 que copia la tabla hija preservando
  identidad, estado y errores de sync.
- Pruebas y documentacion: contrato, migraciones, UI logica, sync y Spec 071.

## Contratos y datos afectados

- API: `LaborDto.labor` agrega `poda_formacion`, `poda_saneamiento`,
  `poda_aclareo_iluminacion` y `poda_rejuvenecimiento_severa`; no cambia la
  forma `labores: [{ labor }]`.
- PostgreSQL/PostGIS: se reemplaza solo el `CHECK` de
  `visita_receta_labores.labor`.
- SQLite/outbox: se recrea solo `visita_receta_labores`; no cambia la operacion
  padre `visita_recetas` ni se toca `sync_outbox`.
- autenticacion y permisos: sin cambios.
- variables y despliegue: sin variables nuevas; migracion/API antes de mobile.

## Validaciones ejecutadas

| Comando o prueba       | Resultado                                        |
| ---------------------- | ------------------------------------------------ |
| 6 suites focalizadas   | 80 pruebas aprobadas                             |
| `pnpm.cmd test`        | 220 archivos y 1680 pruebas aprobadas            |
| typecheck API y mobile | aprobado                                         |
| lint API y mobile      | aprobado                                         |
| build API y mobile     | aprobado                                         |
| `pnpm.cmd docs:check`  | 142 documentos aprobados                         |
| `git diff --check`     | aprobado                                         |
| `pnpm.cmd db:smoke`    | bloqueado por R-001 antes de migraciones nuevas  |
| DeepSeek Reviewer      | cierre aprobado; F1 corregida y F2 no bloqueante |

## Riesgos conocidos y exclusiones

- R-001 ya registra que el bootstrap historico 001 referencia
  `parcelas.sector_id`; el smoke falla antes de alcanzar la migracion 059.
- La validacion visual en dispositivo queda para la aprobacion humana previa a
  release; no se publica OTA ni se despliega desde esta tarea.
- No se crea un catalogo administrativo ni una entidad padre Poda.
- Los codigos permanecen duplicados entre capas segun el patron existente; su
  centralizacion en `packages/` queda fuera de este cambio acotado.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
