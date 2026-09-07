# Handoff: estimaciones semanales de visitas por agrónomo

## Identificación

- fecha: 2026-09-07
- responsable: Codex
- spec o issue: Spec 078
- alcance del diff: migración 060, módulo API `estimaciones`, módulo web
  `estimaciones`, autorización, navegación y documentación canónica asociada
- criticidad: alta

## Objetivo

Permitir que ADMIN y ANALISTA registren metas semanales de visitas para cada
agrónomo activo y comparen esas metas con las visitas reales activas atribuidas
al mismo usuario durante la semana calendario.

## Cambios realizados

- migración y entidad con unicidad semanal, constraints, baja lógica, auditoría
  e índice de comparación;
- endpoints GET y PUT con normalización lunes-domingo, lote transaccional,
  validación vigente de actores y cálculos derivados;
- pantalla principal con selector semanal, captura tabular, totales, estados de
  error y protección de cambios sin guardar;
- ruta y navegación restringidas a ADMIN y ANALISTA;
- pruebas unitarias, seguridad, documentación de arquitectura, dominio y riesgo.

## Contratos y datos afectados

- API: `GET` y `PUT /estimaciones/semanas/:fecha`.
- PostgreSQL/PostGIS: nueva tabla `estimaciones_visitas` e índice parcial sobre
  visitas activas por agrónomo y fecha.
- SQLite/outbox: sin cambios.
- autenticación y permisos: ADMIN y ANALISTA; PUT con
  `AllowAnalystMutation`; AGRONOMO excluido.
- variables y despliegue: sin variables; desplegar migración, API y luego web.

## Validaciones ejecutadas

| Comando o prueba                         | Resultado                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| pruebas focalizadas                      | 7 archivos, 70 pruebas aprobadas después de las correcciones de revisión        |
| `pnpm check`                             | 233 archivos y 1829 pruebas aprobadas; documentación válida                     |
| `pnpm build`                             | API, web, mobile y paquetes aprobados; `/estimaciones` generado                 |
| `pnpm db:smoke`                          | bloqueado por R-001 en migración histórica 001 antes de alcanzar la 060         |
| Prettier focalizado y `git diff --check` | aprobado para el alcance; baseline global de formato permanece fuera de alcance |

## Riesgos conocidos y exclusiones

- R-001 impide validar la cadena completa de bootstrap; el fallo preexistente se
  reprodujo y actualizó en el registro de riesgos.
- No se ejecutaron migraciones contra producción ni se modificó mobile.
- No se incluye exportación, historial completo de versiones o bloqueo de
  semanas cerradas.

## Instrucciones al reviewer

- revisar únicamente el alcance descrito;
- no modificar archivos;
- citar archivo y línea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.

## Resultado de revisión

- DeepSeek aprobó el alcance sin defectos bloqueantes.
- Se aceptaron y corrigieron cuatro hallazgos bajos: metadata `@Unique` de
  `public_id`, metadata del índice parcial de visitas, visualización del autor de
  creación y zona horaria `America/Lima` para auditoría.
- La segunda revisión confirmó las correcciones y emitió veredicto final
  aprobado sin defectos restantes.
