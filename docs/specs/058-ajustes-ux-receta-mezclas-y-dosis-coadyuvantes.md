---
title: Ajustes UX de receta y mezclas con dosis de coadyuvantes
status: implemented
numero: "058"
area: mobile, recetas, mezclas, sqlite, postgresql, api, sync, ux
created: 2026-08-19
approved_by: usuario mediante solicitud y aclaracion de dosis libre obligatoria, 2026-08-19
implemented_in: apps/mobile/src/modules/visita-recetas; apps/mobile/src/modules/labores-culturales-visita; apps/mobile/src/shared/database; apps/mobile/src/shared/sync; apps/api/src/modules/visita-recetas; apps/api/src/database/migrations/054-dosis-coadyuvantes-por-mezcla.ts, 2026-08-19
---

# Spec 058: Ajustes UX de receta y mezclas con dosis de coadyuvantes

## Contexto

La separacion de Receta y Mezclas simplifico el cierre, pero requiere pulir la
jerarquia visual, recuperar el intercambio manual del orden, corregir la edicion
de cantidad de mezclas y ocultar acciones preventivas opcionales hasta que el
usuario decida abrirlas. Los coadyuvantes seleccionados tampoco conservan su
dosis de uso.

## Alcance

### Incluido

- Mejoras de color, posicion, espaciado y estados en Receta y Mezclas.
- Orden de preparacion intercambiable con Agua fija.
- Dosis libre y obligatoria por cada coadyuvante seleccionado.
- Edicion estable de cantidad de mezclas sin forzar `1` mientras se escribe.
- Boton de retorno de Receta a Labores Culturales.
- Retiro del bloque `Avance del paso 6` en Labores Culturales.
- Acciones preventivas fitosanitarias y nutricionales comprimidas y opcionales.
- Etiqueta visible `Curativo`; el valor persistido `reactivo` se conserva por
  compatibilidad.

### Excluido

- Renombrar el enum o contrato persistido `reactivo`.
- Catalogar unidades de coadyuvantes o calcular su cantidad total.
- Cambiar formulas agronomicas, catalogos o permisos.

## Requisitos

- RF-001: Cada coadyuvante seleccionado exige una dosis libre no vacia que
  incluye cantidad y unidad digitadas por el usuario.
- RF-002: La dosis pertenece a una mezcla, se copia con ella y se conserva en
  borrador, SQLite, outbox, API y PostgreSQL.
- RF-003: El orden permite intercambiar dos posiciones movibles; Agua permanece
  fija. Cambiar productos o coadyuvantes regenera el orden automatico.
- RF-004: El campo cantidad admite quedar vacio durante la edicion y solo aplica
  un entero de 1 a 20 al confirmar o perder foco.
- RF-005: Las altas preventivas inician comprimidas, se anuncian como
  opcionales y se expanden de forma independiente.
- RF-006: Las tarjetas muestran `Curativo` o `Preventivo` sin cambiar los datos
  historicos ni el payload compatible.
- RF-007: Receta permite volver a Labores y Labores no muestra el indicador
  redundante `Avance del paso 6`.
- RNF-001: Controles tactiles de al menos 48 dp, estado anunciado por texto y
  color, etiquetas accesibles y mensajes de validacion junto al flujo.
- RNF-002: El cambio conserva la unica operacion padre `visita_recetas`, su
  idempotencia y el orden visita-receta.

## Contratos afectados

- `MezclaDto` agrega `coadyuvantesDosis`, JSON string opcional para clientes
  anteriores y obligatorio por regla de finalizacion cuando hay coadyuvantes.
- PostgreSQL agrega `coadyuvantes_dosis text NULL` a
  `visita_receta_mezclas`.
- SQLite agrega la misma columna a `visita_receta_mezcla`.
- Mobile usa un mapa `{ [coadyuvanteId]: dosisLibre }` en el estado editable.

## Seguridad y datos

No cambian roles ni datos personales. API valida estructura, longitud y
correspondencia entre IDs seleccionados y dosis para evitar payloads
inconsistentes. La dosis es texto tecnico y no se interpreta numericamente.

## Migracion y rollback

- PostgreSQL 054 y SQLite 66 agregan una columna nullable y no reescriben
  recetas, borradores ni outbox existentes.
- API compatible se despliega antes de mobile. Clientes anteriores omiten la
  columna y continuan siendo aceptados por el endpoint legacy.
- Rollback de codigo ignora la columna. SQLite usa correccion hacia adelante;
  PostgreSQL puede conservarla hasta una contraccion posterior aprobada.

## Criterios de aceptacion

- [x] CA-001: No se finaliza una mezcla con coadyuvante sin dosis.
- [x] CA-002: Dosis y orden manual se restauran, copian y sincronizan.
- [x] CA-003: Borrar `3` para escribir `2` no cambia temporalmente el valor a
      `1` ni mueve la mezcla activa.
- [x] CA-004: Agua no puede intercambiarse; dos items movibles si.
- [x] CA-005: Ambas altas preventivas inician comprimidas como opcionales.
- [x] CA-006: La UI no muestra `Reactivo`; muestra `Curativo`.
- [x] CA-007: Receta vuelve a Labores y el avance 6/6 fue retirado.
- [x] CA-008: Clientes y recetas sin dosis de coadyuvante siguen siendo legibles.

## Pruebas

- unitarias de cantidad editable, dosis obligatoria, copia y orden;
- migraciones PostgreSQL y SQLite;
- repositorio, DTO/servicio y payload offline-online;
- lint, tipos y build de mobile/API;
- validacion manual en pantalla pequena y texto ampliado.

## Impacto documental

- [x] Arquitectura offline.
- [x] Modelo de dominio.
- [x] Indices de specs y documentacion.
- [x] ADR: no aplica; extension aditiva del agregado existente.
- [x] Variables o despliegue: no agrega variables; API antes de mobile.
