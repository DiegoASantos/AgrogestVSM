---
title: Frecuencia de dosis por mezcla
status: implemented
numero: "062"
area: mobile, recetas, mezclas, sqlite, postgresql, api, sync, reportes
created: 2026-08-20
approved_by: Usuario mediante instruccion "Implement the plan", 2026-08-20
implemented_in: apps/mobile/src/modules/visita-recetas; apps/mobile/src/shared/database; apps/mobile/src/shared/sync; apps/api/src/modules/visita-recetas; apps/api/src/database/migrations/055-frecuencia-dosis-por-mezcla.ts; apps/admin-web/src/modules/visitas; docs/architecture/mobile-offline-sync.md; docs/domain/data-model.md
---

# Spec 062: Frecuencia de dosis por mezcla

## Contexto

La receta para el productor resume los productos y coadyuvantes de cada mezcla,
pero no indica cada cuanto debe repetirse la dosis. La frecuencia corresponde al
tanque completo y no debe repetirse visualmente por cada insumo de la mezcla.

## Alcance

### Incluido

- Captura obligatoria de una frecuencia de dosis libre por mezcla en mobile.
- Persistencia en borrador, SQLite, outbox, API y PostgreSQL.
- Copia de la frecuencia al copiar una mezcla.
- Columna agrupada `Frecuencia de dosis` en los PDF mobile y web.
- Compatibilidad con recetas historicas y clientes mobile anteriores.

### Excluido

- Interpretar intervalos, unidades temporales o calendarios de aplicacion.
- Frecuencias distintas por producto dentro de una mezcla.
- Cambios en formulas agronomicas, permisos o catalogos.

## Requisitos

- RF-001: Cada mezcla nueva exige `frecuenciaDosis`, texto libre recortado de 1
  a 200 caracteres, antes de finalizar la visita.
- RF-002: La frecuencia se conserva al guardar, restaurar o copiar una mezcla y
  viaja dentro de `mezclas[]` en la unica operacion padre `visita_recetas`.
- RF-003: El endpoint legacy de guardado acepta omitir el campo; el endpoint de
  finalizacion rechaza mezclas sin frecuencia.
- RF-004: Los PDF mobile y web agregan `Frecuencia de dosis` a la derecha de
  `Dosis` y muestran una sola celda por mezcla con el mismo `rowspan` de
  `Mezcla`.
- RF-005: Una receta historica sin frecuencia muestra `-` en el reporte y sigue
  siendo legible.
- RNF-001: El cambio conserva orden padre-hijos, idempotencia, reintentos y la
  unica operacion de outbox de la receta.
- RNF-002: Los textos dinamicos se escapan en HTML y la tabla mantiene
  legibilidad con texto ampliado o frecuencias largas.

## Contratos afectados

- `MezclaDto` y la respuesta de receta agregan
  `frecuenciaDosis?: string | null`.
- SQLite agrega `frecuencia_dosis TEXT NULL` a `visita_receta_mezcla`.
- PostgreSQL agrega `frecuencia_dosis text NULL` a
  `visita_receta_mezclas`.
- Mobile agrega `frecuenciaDosis` al estado editable de la mezcla.

## Seguridad y datos

No cambian roles, guards ni datos personales. La frecuencia es texto tecnico;
API limita su longitud y los reportes escapan el contenido antes de insertarlo
en HTML.

## Migracion y rollback

- PostgreSQL 055 y SQLite 67 agregan columnas nullable sin reescribir recetas,
  borradores ni operaciones pendientes.
- Despliegue: migracion PostgreSQL y API compatible, admin web y finalmente
  mobile/OTA.
- El rollback de codigo ignora la columna. SQLite usa correccion hacia adelante;
  PostgreSQL conserva la columna hasta una contraccion posterior aprobada.

## Criterios de aceptacion

- [x] CA-001: Una mezcla nueva sin frecuencia no alcanza estado `Lista` ni se
      puede finalizar.
- [x] CA-002: La frecuencia se restaura, copia, persiste y sincroniza sin crear
      otra operacion de outbox.
- [x] CA-003: API final rechaza frecuencia vacia o mayor a 200 caracteres y el
      guardado legacy sigue aceptando su ausencia.
- [x] CA-004: Los PDF mobile y web muestran la frecuencia a la derecha de dosis,
      una vez por mezcla aunque tenga siete o mas insumos.
- [x] CA-005: Recetas historicas sin frecuencia muestran `-`.

## Pruebas

- unitarias de estado, validacion, copia y sanitizacion de mezclas;
- migraciones y repositorio SQLite/PostgreSQL;
- DTO, servicio, respuesta y compatibilidad del endpoint legacy;
- offline-online, reintento y payload padre;
- salida HTML y validacion visual de PDF mobile y web.

## Impacto documental

- [x] Arquitectura.
- [x] Dominio.
- [x] Indice documental y de specs.
- [x] ADR: no aplica; extiende el agregado de receta existente.
- [x] Variables o despliegue: no agrega variables; API antes de mobile.
