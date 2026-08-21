# Handoff: Fertilización general sin deficiencia nutricional

## Identificacion

- fecha: 2026-08-21
- responsable: Codex
- spec o issue: Spec 064
- alcance del diff: receta mobile, resumen de receta anterior, prueba de
  compatibilidad API y documentacion canonica
- criticidad: media

## Objetivo

Permitir que el tecnico recomiende uno o varios fertilizantes sin diagnosticar
ni inventar una deficiencia nutricional, conservando el agregado offline de
receta y diferenciando los registros historicos incompletos.

## Cambios realizados

- selector de nutriente opcional al agregar fertilizacion;
- creacion preventiva con nutriente y nombre nulos y factor 1;
- agrupacion estable de productos generales en una sola tarjeta;
- etiqueta compartida entre receta y resumen anterior;
- compatibilidad conservada para recomendaciones por nutriente y filas
  reactivas historicas;
- Spec 064, indices y arquitectura offline actualizados.

## Contratos y datos afectados

- API: sin cambios; se agrego una prueba del caso nullable ya soportado.
- PostgreSQL/PostGIS: sin cambios.
- SQLite/outbox: sin migracion; una fila por producto dentro de la operacion
  padre `visita_recetas` existente.
- autenticacion y permisos: sin cambios.
- variables y despliegue: sin cambios; compatible con OTA mobile.

## Validaciones ejecutadas

| Comando o prueba                           | Resultado                              |
| ------------------------------------------ | -------------------------------------- |
| Vitest enfocado mobile                     | 3 archivos, 40/40 pruebas correctas    |
| Vitest de servicio API                     | 1 archivo, 23/23 pruebas correctas     |
| Vitest `apps/mobile/src`                   | 77 archivos, 526/526 pruebas correctas |
| `pnpm --filter @agrogest/mobile typecheck` | correcto                               |
| `pnpm --filter @agrogest/api typecheck`    | correcto                               |
| lint completo mobile y API                 | correcto                               |
| `pnpm docs:check`                          | correcto, 132 documentos               |
| Prettier y `git diff --check`              | correcto                               |

## Riesgos conocidos y exclusiones

- no se ejecuto prueba manual en un dispositivo desde esta sesion;
- no cambian esquema, contrato, evaluaciones nutricionales ni calculos;
- el diff contiene tambien los cambios locales aprobados de la Spec 063, que
  deben conservarse y revisarse como contexto relacionado.

## Revision independiente

- veredicto: cambios coherentes, sin defectos bloqueantes ni riesgos de
  seguridad;
- observacion de etiqueta rechazada: un registro con `nutrienteId` pero sin
  nombre no es una fertilizacion general y debe advertir que falta el dato;
- observacion de API sincrona rechazada para este alcance: pertenece a la
  implementacion previa de la Spec 063 y no produce un defecto funcional;
- cobertura de borrado/restauracion diferida como deuda baja de prueba de UI:
  agrupacion, serializacion, restauracion y suite completa verifican las rutas
  responsables, pero no existe un harness de interaccion para esta pantalla;
- duracion: 343.95 segundos; la exportacion automatica de consumo fallo despues
  del veredicto, por lo que los tokens y el coste no quedaron reportados.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
