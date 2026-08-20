# Handoff: Frecuencia de dosis por mezcla

## Identificacion

- fecha: 2026-08-20
- responsable: Codex
- spec o issue: Spec 062
- alcance del diff: captura mobile, SQLite, outbox, API, PostgreSQL, PDF mobile
  y web, pruebas y documentacion de frecuencia de dosis por mezcla
- criticidad: alta

## Objetivo

Registrar una frecuencia de dosis obligatoria por mezcla y mostrarla una sola
vez, a la derecha de `Dosis`, en la tabla de receta para el productor aunque la
mezcla contenga multiples productos o coadyuvantes.

## Cambios realizados

- mobile: agrega el campo al estado editable, borrador, copia, validacion,
  persistencia SQLite y restauracion historica;
- sync: conserva la unica operacion padre `visita_recetas` y envia
  `mezclas[].frecuenciaDosis` durante reintentos;
- API: agrega el campo compatible al DTO, entidad, servicio y respuesta; lo
  exige solo al finalizar una mezcla nueva;
- datos: migraciones aditivas SQLite 67 y PostgreSQL 055, ambas nullable y sin
  reescritura de filas;
- reportes: agrega la columna agrupada a la derecha de `Dosis` en mobile y web,
  con escape HTML y `-` para recetas historicas;
- documentacion: Spec 062, arquitectura offline, modelo de dominio e indices.

## Contratos y datos afectados

- API: `MezclaDto` y respuesta agregan `frecuenciaDosis?: string | null`, con
  trim y maximo de 200 caracteres;
- PostgreSQL/PostGIS: `visita_receta_mezclas.frecuencia_dosis text NULL`;
- SQLite/outbox: `visita_receta_mezcla.frecuencia_dosis TEXT NULL`; el payload
  sigue anidado en `visita_recetas`;
- autenticacion y permisos: sin cambios;
- variables y despliegue: sin variables nuevas; migracion/API antes de web y
  mobile.

## Validaciones ejecutadas

| Comando o prueba                      | Resultado                                     |
| ------------------------------------- | --------------------------------------------- |
| `pnpm lint`                           | OK                                            |
| `pnpm typecheck`                      | OK                                            |
| `pnpm test`                           | 209 archivos, 1584 pruebas, OK                |
| `pnpm build`                          | API, admin web, mobile y paquetes, OK         |
| `pnpm docs:check`                     | 128 documentos, OK                            |
| Render HTML/PDF e inspeccion visual   | OK, siete filas y frecuencia larga agrupadas  |
| `pnpm db:smoke`                       | bloqueado antes de 055 por R-001 preexistente |
| `git diff --check`                    | OK                                            |
| Prettier focalizado en archivos scope | OK                                            |

## Riesgos conocidos y exclusiones

- R-001 impide que el bootstrap fresco alcance migraciones recientes porque la
  migracion historica 001 referencia `parcelas.sector_id`; el proceso temporal
  se cerro sin tocar produccion;
- clientes historicos pueden omitir el campo en guardado y sus reportes muestran
  `-`; una finalizacion nueva exige completarlo;
- no se interpretan intervalos ni se programan aplicaciones;
- falta validacion humana final con datos reales antes del release.

## Revision independiente inicial

- DeepSeek emitio veredicto `APPROVE` sin bloqueantes;
- se acepto su observacion menor sobre normalizacion: API convierte texto vacio
  o compuesto solo por espacios a `null` en el guardado compatible;
- se conservo la validacion visible del campo requerido porque sigue el patron
  vigente de los demas datos obligatorios de la mezcla;
- al cambiar el diff despues de esta revision, se requiere una segunda revision
  independiente sobre el estado final.

## Instrucciones al reviewer

- revisar unicamente el alcance descrito;
- no modificar archivos;
- citar archivo y linea;
- priorizar perdida del campo entre borrador, SQLite, sync y API, ruptura de
  compatibilidad, validacion incompleta y repeticion visual de la frecuencia;
- verificar que la columna quede a la derecha de `Dosis` y use el mismo rowspan
  por mezcla;
- devolver veredicto y hallazgos por severidad.
