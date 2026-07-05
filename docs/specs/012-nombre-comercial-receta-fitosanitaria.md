---
title: Selector de nombre comercial en receta fitosanitaria
status: implemented
numero: "012"
area: receta, mobile, api, database, sync
created: 2026-07-05
approved_by: usuario, 2026-07-05
implemented_in: working tree, 2026-07-05
---

# Spec 012: Selector de nombre comercial en receta fitosanitaria

## Contexto

La pantalla mobile de receta permite escribir manualmente el ingrediente activo
y la marca de producto fitosanitario. Eso introduce errores de digitacion y no
aprovecha los catalogos existentes de `tipos_producto_fitosanitario`,
`ingredientes_activos` y `marcas_producto`.

El usuario aprobo mantener la tabla `marcas_producto` tal cual y usar su columna
`nombre` como el nombre comercial visible en UI.

## Alcance

### Incluido

- Agregar la relacion `marcas_producto.tipo_producto_id` hacia
  `tipos_producto_fitosanitario`.
- Sembrar los datos de `guia_1.png` y `guia_2.png` en los catalogos existentes.
- Mantener `marcas_producto.nombre` como nombre comercial.
- Cambiar el label mobile de "Marca de producto" a "Nombre comercial".
- Reemplazar los inputs manuales de ingrediente activo y nombre comercial por un
  selector dependiente del tipo de producto.
- Al seleccionar nombre comercial, autocompletar ingrediente activo y
  concentracion cuando el catalogo lo provea.
- Si para un tipo de producto solo existe una opcion disponible de nombre
  comercial, seleccionarla por defecto.
- Mantener compatibilidad con recetas locales existentes que ya guardan nombres
  como texto.

### Excluido

- Renombrar la tabla `marcas_producto`.
- Crear una tabla nueva para nombres comerciales.
- Crear CRUD web de catalogos fitosanitarios.
- Cambiar el payload de receta para guardar IDs de nombre comercial en vez de
  textos.

## Requisitos

- RF-001: El catalogo de marcas debe incluir `tipoProductoId` para filtrar por
  tipo de producto.
- RF-002: El selector de nombre comercial solo debe mostrar opciones del tipo de
  producto seleccionado.
- RF-003: Si no hay tipo de producto seleccionado, el selector de nombre
  comercial debe quedar deshabilitado.
- RF-004: Al cambiar el tipo de producto se debe limpiar una seleccion comercial
  incompatible.
- RF-005: Si un tipo de producto tiene una sola opcion, esa opcion se selecciona
  automaticamente.
- RF-006: La receta sigue persistiendo `ingredienteActivoNombre`,
  `marcaProductoNombre` y `concentracionProducto` para compatibilidad.
- RNF-001: La migracion PostgreSQL y SQLite debe ser no destructiva.
- RNF-002: La descarga de catalogos debe invalidar cache local para recibir el
  nuevo campo.

## Contratos afectados

- PostgreSQL: `marcas_producto.tipo_producto_id`, FK hacia
  `tipos_producto_fitosanitario`, indice por tipo y semillas.
- API: `GET /marcas-producto` devuelve `tipoProductoId`.
- SQLite mobile: `marcas_producto.tipo_producto_id`.
- Mobile: `MarcaProductoCatalogItem` incluye `tipoProductoId`; receta filtra y
  autoselecciona opciones.

## Seguridad y datos

No se agregan datos personales ni secretos. El cambio es de catalogos agronomicos
y mantiene campos existentes para no perder datos offline ni romper outbox.

## Migracion y rollback

Avance:

- Agregar columna nullable `tipo_producto_id` a `marcas_producto`.
- Poblar tipos, ingredientes activos y nombres comerciales con `INSERT ... WHERE
  NOT EXISTS`.
- Agregar columna nullable `tipo_producto_id` a SQLite y forzar refresco de
  catalogos.
- Ajustar API/mobile para tolerar registros sin tipo durante la transicion.

Rollback operativo:

- Detener clientes que dependan del selector filtrado.
- Mantener los datos existentes; el campo es nullable y no afecta recetas ya
  guardadas.
- Si se requiere revertir esquema, eliminar FK, indice y columna
  `tipo_producto_id` tras respaldar catalogos.

## Criterios de aceptacion

- [x] CA-001: En receta mobile, "Nombre comercial" es un selector y no un input
  manual.
- [x] CA-002: Las opciones se filtran por tipo de producto.
- [x] CA-003: Los tipos con una sola opcion se seleccionan automaticamente.
- [x] CA-004: `GET /marcas-producto` entrega `tipoProductoId`.
- [x] CA-005: SQLite recibe y conserva `tipo_producto_id` en `marcas_producto`.
- [x] CA-006: Los datos de ambas guias quedan sembrados.

## Pruebas

- unitarias de migracion PostgreSQL;
- pruebas de migracion SQLite/catalog refresh;
- typecheck mobile y API;
- validacion manual de receta mobile.

## Impacto documental

- [ ] Arquitectura.
- [x] Dominio/spec.
- [ ] Runbook.
- [ ] ADR.
- [ ] Variables o despliegue.
