---
title: Concentraciones y unidades de productos en receta mobile
status: implemented
numero: "024"
area: receta, catalogos, api, database, mobile
created: 2026-08-01
approved_by: usuario, 2026-08-01
implemented_in: apps/api, apps/mobile y docs, 2026-08-01
---

# Spec 024: Concentraciones y unidades de productos en receta mobile

## Contexto

Los catalogos de nombres comerciales y fertilizantes no conservan de forma
completa la concentracion comercial y su unidad. La receta mobile permite editar
la concentracion fitosanitaria y no muestra la del fertilizante, aunque ambos
valores corresponden al producto seleccionado y deben proceder del catalogo.

La fuente funcional es `AGROQUIMICOS CON MODO DE ACCION.docx`. La primera tabla
contiene 21 nombres comerciales fitosanitarios. La segunda contiene 13 filas,
pero los nombres separados por `/` representan productos distintos; por ello el
catalogo resultante contiene 15 fertilizantes.

## Alcance

### Incluido

- Conservar concentracion textual y unidad de medida en `marcas_producto`.
- Conservar concentracion textual y unidad de medida en `fertilizantes`.
- Actualizar filas existentes por nombre normalizado e insertar solo ausentes.
- Corregir `Ajustar 25 SC` a `Austar 25 SC` sin duplicar el producto.
- Separar Aminofol, Isabion, Alstar y Acadian como productos individuales.
- Extender los catalogos API y su cache SQLite de forma compatible.
- Autocompletar concentracion y unidad en un solo campo readonly de la receta
  mobile para fitosanitarios y fertilizantes.

### Excluido

- Mostrar o persistir el modo o funcion agronomica de fertilizantes.
- Cambiar el payload o las tablas de detalle de recetas ya guardadas.
- Cambiar PDFs, panel web, permisos, outbox o el orden de sincronizacion.
- Borrar recetas o catalogos historicos.

## Requisitos

- RF-001: Las 21 marcas de la fuente tienen su concentracion y unidad.
- RF-002: Los 15 fertilizantes resultantes tienen concentracion, unidad y tipo.
- RF-003: La carga usa coincidencia de nombre sin distinguir mayusculas ni
  espacios laterales y no inserta una fila cuando ya existe.
- RF-004: La API entrega `concentracionTexto` y `unidadMedida`; el campo legado
  `concentracion` conserva un numero solo cuando el texto es un decimal simple.
- RF-005: Mobile guarda ambos campos de catalogo en SQLite y fuerza una recarga
  del cache despues de la migracion aditiva.
- RF-006: Al seleccionar un producto, mobile muestra concentracion y unidad en
  el mismo input, cargado automaticamente y no editable.
- RF-007: Un valor compuesto o cualitativo, como `18-46-00` o `Variado`, nunca
  se interpreta parcialmente para calcular cantidad total de producto.
- RNF-001: Clientes mobile anteriores siguen leyendo respuestas validas; para
  concentraciones no numericas reciben `null` en el campo numerico legado.
- RNF-002: La migracion SQLite no elimina datos offline ni crea outbox.

## Contratos afectados

- PostgreSQL: `marcas_producto.concentracion` pasa de numeric a varchar y agrega
  `unidad_medida`; `fertilizantes` agrega `concentracion` y `unidad_medida`.
- API `GET /marcas-producto`: agrega `concentracionTexto` y `unidadMedida`; el
  campo `concentracion` numerico se mantiene por compatibilidad.
- API `GET /fertilizantes`: agrega `concentracion` y `unidadMedida`.
- SQLite: los catalogos `marcas_producto` y `fertilizantes` agregan
  `unidad_medida`; fertilizantes agrega tambien `concentracion`.
- Los detalles de receta y su payload remoto no cambian.

## Seguridad y datos

No cambia autorizacion, secretos ni datos personales. La migracion solo opera
sobre catalogos. Los updates se resuelven por nombre normalizado y los inserts
usan `NOT EXISTS`, evitando duplicar la informacion ya presente.

## Migracion y rollback

1. Respaldar los catalogos afectados antes del despliegue.
2. Ejecutar la migracion PostgreSQL 037 y desplegar la API compatible.
3. Distribuir mobile con la migracion SQLite 49; esta invalida exclusivamente
   la marca de cache para descargar nuevamente los catalogos.

Rollback operativo: conservar las columnas aditivas y los datos; volver a una
API anterior sigue siendo posible para concentraciones numericas. Si se requiere
revertir mobile, publicar una correccion compatible con el mismo runtime. Los
valores textuales no se convierten nuevamente a numeric de forma automatica; una
contraccion futura requiere verificar y normalizar primero todos los valores.

## Criterios de aceptacion

- [x] CA-001: Las 21 marcas y 15 fertilizantes quedan actualizados sin nombres
      duplicados por la migracion.
- [x] CA-002: `Austar 25 SC` queda activo y el typo anterior no aparece como una
      segunda opcion activa.
- [x] CA-003: Los endpoints entregan concentracion y unidad con compatibilidad
      numerica para clientes anteriores.
- [x] CA-004: SQLite migra a version 49, preserva datos y fuerza la recarga de
      catalogos.
- [x] CA-005: Ambos formularios muestran un unico campo readonly con
      concentracion y unidad al seleccionar el producto.
- [x] CA-006: Solo concentraciones decimales simples participan en el calculo
      fitosanitario.

## Pruebas

- unitarias de migracion PostgreSQL y contrato de catalogos;
- migracion SQLite y preservacion del indicador de recarga;
- selector, autocompletado y representacion readonly mobile;
- lint, typecheck, pruebas y build proporcionales de API y mobile;
- `db:smoke` cuando el entorno PostgreSQL/PostGIS local este disponible.

## Impacto documental

- [x] Arquitectura: cache offline actualizado sin cambiar sus invariantes.
- [x] Dominio: concentracion y unidad de ambos catalogos documentadas.
- [x] Runbook: el rollback se cubre con el runbook existente.
- [x] ADR: no corresponde.
- [x] Variables o despliegue: sin variables nuevas; API antes que mobile.
