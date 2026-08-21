# Handoff: Desmarcado sanitario coherente con receta mobile

## Identificacion

- fecha: 2026-08-21
- responsable: Codex
- spec o issue: Spec 063
- alcance del diff: formulario sanitario, tombstones de observaciones, receta
  mobile, pruebas y documentacion canonica
- criticidad: media

## Objetivo

Eliminar de SQLite una plaga o enfermedad desmarcada y evitar que la receta o
una respuesta remota atrasada vuelvan a mostrarla, conservando el flujo
offline-first y los productos digitados manualmente.

## Cambios realizados

- reconciliacion pura entre observaciones existentes y selecciones activas;
- borrado de observaciones desmarcadas al confirmar Plagas o Enfermedades;
- lectura por propietario de tombstones `delete` en outbox y fallos durables;
- filtrado de hallazgos remotos atrasados y borradores reactivos vacios;
- pruebas de seleccion, borrado local/remoto, aislamiento y receta;
- Spec 063, indices y arquitectura offline actualizados.

## Contratos y datos afectados

- API: sin cambios; reutiliza el endpoint de borrado existente.
- PostgreSQL/PostGIS: sin cambios.
- SQLite/outbox: sin migracion; reutiliza tablas y operaciones existentes.
- autenticacion y permisos: sin cambios; tombstones filtrados por usuario.
- variables y despliegue: sin cambios; compatible con OTA mobile.

## Validaciones ejecutadas

| Comando o prueba                           | Resultado                              |
| ------------------------------------------ | -------------------------------------- |
| Vitest enfocado (4 archivos)               | 46/46 pruebas correctas                |
| Vitest `apps/mobile/src`                   | 77 archivos, 520/520 pruebas correctas |
| `pnpm --filter @agrogest/mobile typecheck` | correcto                               |
| `pnpm --filter @agrogest/mobile lint`      | correcto                               |
| `pnpm docs:check`                          | correcto, 130 documentos               |
| Prettier sobre el alcance                  | correcto                               |

## Riesgos conocidos y exclusiones

- no se ejecuta prueba manual en dispositivo desde esta sesion;
- los productos ya digitados y recomendaciones preventivas se conservan aunque
  el objetivo deje de estar diagnosticado;
- no cambian esquema, API ni reglas de calificacion.

## Revision independiente

- M1 aceptado y corregido: una observacion local re-agregada invalida el
  tombstone para la UI sin retirar las operaciones de sync ordenadas;
- L1 aceptado y corregido: Spec 063 cerrada como `implemented`, con archivos y
  criterios registrados;
- el diff corregido requiere una segunda revision de solo lectura.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
