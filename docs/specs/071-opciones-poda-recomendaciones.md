---
title: Opciones de poda en recomendaciones de labores culturales
status: approved
numero: "071"
area: mobile, api, sqlite, postgresql, recetas, labores culturales
created: 2026-09-01
approved_by: usuario, 2026-09-01
implemented_in: apps/api/src/database/migrations/059-opciones-poda-receta.ts; apps/api/src/modules/visita-recetas; apps/mobile/src/shared/database; apps/mobile/src/modules/visita-recetas
---

# Spec 071: Opciones de poda en recomendaciones de labores culturales

## Contexto

La seccion de recomendaciones de labores culturales de Receta muestra
"Limpieza con motoguadana" y ofrece seis valores planos. El texto correcto es
"Limpieza con motoguadaña" y el tecnico necesita recomendar uno de cuatro
tipos de poda sin sobrecargar visualmente la lista principal.

## Alcance

### Incluido

- Corregir el texto visible de motoguadaña sin cambiar su codigo persistido.
- Agregar formacion, saneamiento, aclareo/iluminacion y
  rejuvenecimiento/severa como labores persistibles.
- Presentar las cuatro opciones dentro de un grupo desplegable llamado Poda.
- Permitir como maximo una opcion de poda por receta.
- Ampliar de forma compatible los constraints de PostgreSQL y SQLite.

### Excluido

- Crear un catalogo administrativo o una fila persistida para el padre Poda.
- Modificar el tipo de operacion, orden o reintentos de la outbox.
- Alterar labores culturales ya guardadas.

## Requisitos

- RF-001: La UI muestra "Limpieza con motoguadaña" para
  `limpieza_maleza_motoguadana`.
- RF-002: El contrato acepta `poda_formacion`, `poda_saneamiento`,
  `poda_aclareo_iluminacion` y `poda_rejuvenecimiento_severa`.
- RF-003: Poda es un padre visual no persistible que despliega los cuatro
  subtipos.
- RF-004: Seleccionar un subtipo de poda reemplaza cualquier otro subtipo de
  poda, pero conserva las labores no relacionadas.
- RF-005: Pulsar el subtipo activo permite dejar Poda sin seleccion.
- RF-006: El contrato admite las seis labores historicas junto con una poda,
  con un maximo de siete labores por receta.
- RNF-001: Las recetas, borradores y operaciones offline existentes se
  conservan durante la migracion.
- RNF-002: El payload mantiene la forma `labores: [{ labor }]` y las nuevas
  opciones viajan dentro de la unica operacion padre `visita_recetas`.

## Contratos afectados

- API: se amplia el dominio permitido de `LaborDto.labor`; no cambia la forma
  del request ni de la respuesta.
- PostgreSQL: se amplia el `CHECK` de `visita_receta_labores.labor`.
- SQLite: se amplia el mismo `CHECK` conservando IDs y estados de sync.
- Mobile: se amplian el tipo y las etiquetas de labores recomendadas.

## Seguridad y datos

No cambian permisos, datos personales ni secretos. La API conserva sus guards
actuales. La ampliacion es compatible con clientes anteriores porque los seis
valores existentes siguen siendo validos.

## Migracion y rollback

1. Aplicar primero la migracion PostgreSQL y desplegar la API compatible.
2. Publicar mobile con la migracion SQLite y la nueva UI.
3. La migracion SQLite copia la tabla de labores de receta sin borrar recetas,
   borradores ni outbox.

Si ya existen recetas con podas nuevas, no se debe restaurar el constraint
anterior. El rollback operativo mantiene la expansion de datos, revierte solo
la UI si es compatible y aplica una correccion hacia adelante. Antes del
despliegue PostgreSQL se conserva el backup operativo habitual.

## Criterios de aceptacion

- [x] CA-001: La opcion existente se muestra como "Limpieza con motoguadaña".
- [x] CA-002: Poda inicia contraida y despliega exactamente cuatro subtipos.
- [x] CA-003: Solo un subtipo de poda puede estar seleccionado y las demas
      labores conservan seleccion multiple.
- [x] CA-004: Las cuatro podas se guardan offline, sobreviven al reinicio y se
      sincronizan con el mismo payload de receta.
- [x] CA-005: Una instalacion actualizada conserva filas pendientes, errores e
      identidades remotas de `visita_receta_labores`.
- [x] CA-006: Clientes anteriores y recetas con valores historicos siguen
      siendo aceptados.
- [x] CA-007: El DTO acepta seis labores historicas mas una poda y rechaza mas
      de siete elementos.

## Pruebas

- Unitarias de seleccion exclusiva y etiquetas mobile.
- Validacion del DTO con valores nuevos, historicos y desconocidos.
- Migraciones PostgreSQL y SQLite, incluida preservacion de datos offline.
- Guardado, restauracion de borrador y payload offline-online de receta.
- Lint, typecheck, pruebas y build proporcionales de API y mobile.

## Impacto documental

- [x] Arquitectura de sincronizacion mobile.
- [x] Dominio: no requiere una entidad nueva.
- [x] Runbook: sin cambios de procedimiento.
- [x] ADR: sin decision arquitectonica nueva.
- [x] Variables o despliegue: sin variables nuevas; exige orden API antes de mobile.
