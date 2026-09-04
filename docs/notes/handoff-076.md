# Handoff: importación de Google Maps en geodatos web

## Identificación

- fecha: 2026-09-04
- responsable: Codex
- spec o issue: Spec 076
- alcance del diff: editor web de geodatos de parcelas, parser local y pruebas,
  estilos, tipos web y documentación asociada
- criticidad: alta

## Objetivo

Permitir que ADMIN y ANALISTA peguen una URL completa de Google Maps con
coordenadas para ubicar el punto de acceso o el punto interno de una parcela,
sin API externa y conservando el guardado explícito, la edición y el historial
del editor existente.

## Cambios realizados

- `apps/admin-web/src/modules/parcelas/utils/geo-editor.ts`: parser estricto y
  local de tres formatos explícitos de Google Maps, límites y validación del
  punto interno.
- `apps/admin-web/src/modules/parcelas/presentation`: interfaz de importación,
  estado de ambos puntos y mapa con marcadores, eliminación y centrado
  diferenciados.
- `apps/admin-web/src/modules/parcelas/types/parcelas.types.ts`: alineación del
  payload web con `parcelReferencePoint`, ya admitido por la API.
- `apps/admin-web/src/app/globals.css`: estilos responsivos, tema oscuro,
  feedback y leyenda de puntos.
- `docs/`: Spec 076, índices, arquitectura y línea base de seguridad.

## Contratos y datos afectados

- API: sin cambios; se reutiliza `PATCH /parcelas/:id` y su campo existente
  `parcelReferencePoint`.
- PostgreSQL/PostGIS: sin esquema ni migración; se reutiliza la columna
  existente.
- SQLite/outbox: sin cambios.
- autenticación y permisos: sin cambios; conserva los roles y guards actuales
  de parcelas.
- variables y despliegue: sin variables, credenciales, API key ni servicio
  externo.

## Validaciones ejecutadas

| Comando o prueba                               | Resultado                                         |
| ---------------------------------------------- | ------------------------------------------------- |
| Prueba dirigida `geo-editor.test.ts`           | 38/38 aprobadas                                   |
| `pnpm test`                                    | 1802/1802 aprobadas                               |
| Lint admin web                                 | aprobado                                          |
| Typecheck admin web                            | aprobado                                          |
| Build admin web                                | aprobado; ruta de geodatos generada               |
| `pnpm docs:check`                              | aprobado, 151 archivos                            |
| Comprobación visual con navegador              | no ejecutable: no había navegador conectado       |
| Revisión de seguridad según skill del proyecto | sin hallazgos; URL local, allowlist y sin `fetch` |

## Riesgos conocidos y exclusiones

- No se validó visualmente en navegador por indisponibilidad del navegador de
  la sesión; build y estilos responsivos sí fueron validados estáticamente.
- Se rechazan deliberadamente URLs cortas, enlaces con coordenadas solo tras
  `@`, direcciones, nombres de lugar y plus codes.
- No se ejecutó una prueba contra PostgreSQL porque no cambia la API ni la base
  y el contrato reutilizado ya cuenta con pruebas de servicio.
- Commit y despliegue permanecen fuera de alcance.

## Disposición de la primera revisión

- M1 aceptado: Spec 076 cerrada como `implemented`, con `implemented_in` y
  criterios actualizados.
- L1 aceptado: corregido el texto visible `Mover geometría`.
- L2 aceptado: Cancelar y guardar limpian la URL y su feedback; deshacer y
  rehacer limpian feedback potencialmente obsoleto.
- L3 parcialmente aceptado: el caso `%2C` ya estaba cubierto y se agregó el
  rechazo explícito del sufijo `,17z`; la doble aplicación converge por igualdad
  de estado, pero no existe infraestructura de prueba de componentes para
  simular dos eventos de pegado.
- I3 aceptado preventivamente: la importación usa actualización funcional y no
  depende de una referencia potencialmente atrasada.
- I1, I2 e I4 no requieren cambio: mantienen compatibilidad con respuestas
  parciales, sincronización histórica del mapa y precisión original hasta que
  el usuario arrastra un marcador.

## Instrucciones al reviewer

- revisar únicamente el alcance descrito;
- incluir en la revisión los archivos no rastreados de Spec 076 y este handoff;
- no modificar archivos;
- citar archivo y línea;
- priorizar defectos reproducibles;
- devolver veredicto y hallazgos por severidad.
