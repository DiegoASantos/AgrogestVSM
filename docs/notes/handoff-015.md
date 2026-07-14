# Handoff: Spec 015 sync robusto en redes inestables

## Identificacion

- fecha: 2026-07-11
- responsable: Codex
- spec o issue: Spec 015
- alcance del diff: `docs/specs/015-sync-robusto-redes-inestables.md`, `docs/specs/README.md`, `docs/index.md`
- criticidad: alta

## Objetivo

Revisar que la spec corrija el diagnostico de lentitud, sync manual colgado y
relogueo obligatorio sin romper offline-first, auth, orden padre-hijos ni
compatibilidad SQLite.

## Cambios realizados

- nueva spec draft con evidencia, requisitos, estados, migracion, rollback,
  criterios y pruebas;
- indices documentales actualizados.

## Contratos y datos afectados

- API: sin cambio propuesto;
- PostgreSQL/PostGIS: sin cambio;
- SQLite/outbox: nueva tabla aditiva `sync_failures` propuesta;
- autenticacion y permisos: estado online reauth requerido con acceso offline;
- variables y despliegue: sin variables; version mobile compatible requerida.

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| --- | --- |
| `git diff --check` | correcto |
| rutas y enlaces de evidencia | existen |
| `pnpm docs:check` | bloqueado por fallo preexistente de frontmatter en Spec 002 |
| DeepSeek Reviewer, primera pasada | aprobar con observaciones; H1-H3 aceptados y corregidos |

## Riesgos conocidos y exclusiones

- la spec permanece `draft` y no autoriza implementacion;
- no se reconstruyen automaticamente fallos legacy cuyo outbox ya fue borrado;
- timeouts y backoff requieren validacion Android con red rural simulada/real;
- no se almacena contrasena ni se agrega biometria.
- esta segunda revision debe verificar deadline/margen UI, cooldown acotado,
  DDL conceptual y tratamiento explicito de fallos permanentes/deletes.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles, contradicciones y criterios no verificables;
- devolver veredicto y hallazgos por severidad.
