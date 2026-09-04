# Handoff: Acceso ANALISTA a Mantenimiento y Reportes web

## Identificacion

- fecha: 2026-09-04
- responsable: Codex
- spec o issue: Spec 072
- alcance del diff: autorizacion API de Mantenimiento, matriz de rutas y
  navegacion admin web, pagina `/reportes`, pruebas y documentacion canonica
- criticidad: alta

## Objetivo

Permitir a ANALISTA administrar todos los modulos web de Mantenimiento,
incluidos geodatos y asignacion de agronomos, y abrir un modulo Reportes vacio,
sin habilitar Seguridad ni otras mutaciones.

## Cambios realizados

- Controladores API: roles ADMIN/ANALISTA y excepcion explicita para cada
  mutacion de Mantenimiento; se preservan permisos AGRONOMO existentes.
- Productores y Parcelas: ANALISTA prevalece sobre el alcance AGRONOMO cuando
  una cuenta tiene ambos roles; asignacion de agronomos admite ADMIN/ANALISTA.
- Admin web: Mantenimiento y `/reportes` para ADMIN/ANALISTA; Seguridad solo
  ADMIN; lookup minimo de agronomos en Parcelas.
- Documentacion: Spec 072, excepcion historica de Spec 022, arquitectura,
  indices y linea base de seguridad.

## Contratos y datos afectados

- API: mismas rutas, DTOs y respuestas; cambia solo la autorizacion de
  mutaciones existentes de Mantenimiento.
- PostgreSQL/PostGIS: sin cambios.
- SQLite/outbox: sin cambios.
- autenticacion y permisos: excepciones acotadas por endpoint para ANALISTA;
  el bloqueo global y el rechazo mobile permanecen.
- variables y despliegue: sin cambios; desplegar API antes o junto con web.

## Validaciones ejecutadas

| Comando o prueba | Resultado |
| ---------------- | --------- |
| Pruebas focalizadas (8 archivos) | 155 aprobadas |
| `pnpm.cmd --filter @agrogest/api lint` | aprobado |
| `pnpm.cmd --filter @agrogest/api typecheck` | aprobado |
| `pnpm.cmd --filter @agrogest/api build` | aprobado |
| `pnpm.cmd --filter @agrogest/admin-web lint` | aprobado |
| `pnpm.cmd --filter @agrogest/admin-web typecheck` | aprobado |
| `pnpm.cmd --filter @agrogest/admin-web build` | aprobado, incluye `/reportes` |
| `pnpm.cmd test` | 222 archivos y 1745 pruebas aprobadas |
| `pnpm.cmd docs:check` | 144 documentos aprobados |
| `git diff --check` | aprobado |

## Riesgos conocidos y exclusiones

- Un JWT ANALISTA valido puede usar los endpoints autorizados desde cualquier
  cliente HTTP; no existe una frontera segura basada solo en origen web.
- Reportes no incluye datos, filtros, exportaciones ni endpoints.
- El format check global conserva deuda previa y reporta archivos no
  normalizados fuera de este alcance; lint, tipos y diff check pasan.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- comprobar que ninguna mutacion ajena a Mantenimiento quede abierta;
- devolver veredicto y hallazgos por severidad.
