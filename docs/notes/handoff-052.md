# Handoff: Spec 052 - busqueda y seleccion bidireccional en recetas mobile

## Identificacion

- fecha: 2026-08-18
- responsable: Codex
- spec o issue: Spec 052
- alcance del diff: seleccion pura y formulario de receta mobile; pruebas; spec,
  indices y arquitectura mobile
- criticidad: media

## Objetivo

Permitir buscar en los catalogos principales de receta y elegir Nombre comercial
despues del tipo de producto, incluso sin elegir antes el ingrediente. La marca
seleccionada debe completar su ingrediente valido, concentracion y unidad sin
cambiar persistencia ni sincronizacion.

## Cambios realizados

- `visita-receta-selection.ts`: filtra marcas por tipo y relacion vigente y
  resuelve marca a ingrediente, concentracion y unidad.
- `visita-receta-screen.tsx`: habilita la seleccion inversa, muestra el
  ingrediente auxiliar y activa busqueda en cuatro selectores.
- `visita-receta-selection.test.ts`: cubre filtros, relaciones invalidas,
  limpieza, autoseleccion y seleccion inversa.
- `docs/specs/052-busqueda-seleccion-bidireccional-recetas-mobile.md`: registra
  alcance, requisitos, compatibilidad y rollback.
- `docs/specs/README.md`, `docs/index.md` y
  `docs/architecture/mobile-offline-sync.md`: enlazan la spec y actualizan la
  arquitectura vigente.

## Contratos y datos afectados

- API: sin cambios.
- PostgreSQL/PostGIS: sin cambios.
- SQLite/outbox: sin cambios.
- autenticacion y permisos: sin cambios.
- variables y despliegue: sin variables ni dependencias; compatible con OTA.

## Validaciones ejecutadas

| Comando o prueba                                                                                                       | Resultado                                                                           |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm.cmd exec vitest run apps/mobile/src/modules/visita-recetas/presentation/screens/visita-receta-selection.test.ts` | 9/9 pruebas pasan                                                                   |
| `pnpm.cmd exec vitest run apps/mobile/src`                                                                             | 471/471 pruebas pasan                                                               |
| `pnpm.cmd --filter @agrogest/mobile typecheck`                                                                         | pasa                                                                                |
| `pnpm.cmd --filter @agrogest/mobile lint`                                                                              | pasa                                                                                |
| `pnpm.cmd docs:check`                                                                                                  | pasa, 113 documentos validados                                                      |
| `git diff --check`                                                                                                     | pasa                                                                                |
| `pnpm.cmd format:check`                                                                                                | falla por deuda preexistente global de 778 archivos; no se aplico reformateo masivo |

## Riesgos conocidos y exclusiones

- La busqueda visual se valida manualmente sobre `AppSelectField`, cuya
  normalizacion existente elimina mayusculas y tildes y tambien incluye el
  texto auxiliar.
- Se excluye el cambio local preexistente en
  `apps/mobile/src/modules/visitas-campo/presentation/screens/new-visita-campo-screen.tsx`;
  no pertenece a la Spec 052 y no debe revisarse como parte de este alcance.
- No se revisan ni cambian API, bases de datos, outbox o contratos persistidos.
- DeepSeek leyo el alcance en dos intentos, pero su configuracion solicito
  comandos auto-rechazados por el modo de solo lectura y no emitio veredicto.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
