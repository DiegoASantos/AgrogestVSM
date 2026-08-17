---
title: Selector de unidad para dosis fitosanitarias y fertilizantes
status: implemented
numero: "043"
area: receta, fitosanidad, fertilizacion, api, database, mobile
created: 2026-08-17
approved_by: usuario, 2026-08-17
implemented_in: apps/api, apps/mobile y docs, 2026-08-17
---

# Spec 043: Selector de unidad para dosis fitosanitarias y fertilizantes

## Contexto

La formula actual de dosificacion de la receta es correcta, pero la unidad de
la dosis no siempre representa la recomendacion que ingresa el usuario.
Fitosanidad muestra el texto fijo `mg o mL/cilindro`, mientras que
fertilizacion calcula automaticamente `Kg` o `L` segun el tipo de producto.

El usuario debe poder escoger la unidad abreviada de la dosis. La seleccion
debe conservarse al guardar y sincronizar la receta, y debe aparecer en el PDF
que se comparte. Este cambio no modifica valores, factores ni formulas.

## Alcance

### Incluido

- Selector de unidad por producto fitosanitario con `mg`, `g`, `kg`, `ml` y
  `l`.
- Selector de unidad por recomendacion de fertilizacion:
  - producto liquido: `ml` o `l`;
  - producto solido: `mg`, `g` o `kg`.
- Conservacion del denominador actual segun el contexto:
  - fitosanidad: `/cilindro`;
  - fertilizacion edafica: `/planta`;
  - fertilizacion foliar: `/cilindro`.
- Persistencia local SQLite, contrato API, PostgreSQL y sincronizacion offline
  de la unidad fitosanitaria.
- Reutilizacion del campo existente `unidad_dosis` para fertilizacion, con
  valores seleccionados por el usuario.
- Presentacion de la unidad seleccionada en el formulario, consulta de receta,
  resumen de receta anterior y PDF compartido.
- Compatibilidad de lectura con recetas historicas y clientes mobile
  instalados.

### Excluido

- Cambios en la formula `cantidadTotal = dosis * volumenAplicacion * factor`.
- Conversion automatica entre unidades.
- Modificaciones del factor de incidencia, volumen de aplicacion o cantidad de
  plantas.
- Cambios en concentraciones o unidades de los catalogos de productos.
- Cambios en panel admin-web, roles, autenticacion o permisos.

## Requisitos

### RF-001: Selector de unidad en fitosanidad

- Cada producto de una mezcla fitosanitaria muestra un selector junto a la
  dosis de producto comercial.
- Las opciones son `mg`, `g`, `kg`, `ml` y `l`.
- La unidad guardada y mostrada se compone como `<unidad>/cilindro`.
- Cuando existe una dosis, seleccionar una unidad es obligatorio antes de
  guardar la receta.
- Cambiar la unidad no altera ni convierte el valor numerico ingresado.

### RF-002: Selector condicionado en fertilizacion

- Si `tipoProducto = liquido`, el selector ofrece solamente `ml` y `l`.
- Si `tipoProducto = solido`, el selector ofrece solamente `mg`, `g` y `kg`.
- Para via edafica se guarda y muestra `<unidad>/planta`.
- Para via foliar se guarda y muestra `<unidad>/cilindro`.
- Cuando existe una dosis, seleccionar una unidad es obligatorio antes de
  guardar la receta.
- Al cambiar el tipo de producto, una unidad que deje de ser valida se limpia
  y el usuario debe seleccionar otra; el valor numerico de la dosis no se
  convierte.

### RF-003: Calculo sin cambios

La operacion numerica permanece exactamente igual:

```text
cantidadTotal = dosis * volumenAplicacion * factor
```

- En fitosanidad, el total conserva la unidad seleccionada y se muestra por
  hectarea: `mg/ha`, `g/ha`, `kg/ha`, `ml/ha` o `l/ha`.
- En fertilizacion, al multiplicar por plantas o por el total de cilindros, el
  resultado conserva la unidad seleccionada: `mg`, `g`, `kg`, `ml` o `l`.
- No se aplican factores de conversion entre unidades.

### RF-004: Contrato y persistencia

- Agregar `unidadDosis` opcional a cada producto de `mezclas[].productos[]`
  en POST/PUT y GET de receta.
- Agregar `unidad_dosis varchar(30) NULL` a
  `visita_receta_fitosanidad` en PostgreSQL.
- Agregar `unidad_dosis TEXT NULL` a `visita_receta_fitosanidad` en SQLite.
- Mantener el campo `unidadDosis` y la columna `unidad_dosis` existentes en
  fertilizacion.
- Incluir la unidad fitosanitaria en tipos mobile, repositorio SQLite, payload
  de outbox, handler de sync y respuesta remota.
- El backend valida los nuevos valores canonicos sin rechazar payloads legacy
  que omitan la unidad.

### RF-005: Receta compartida e historica

- El PDF compartido muestra la dosis y el total con la unidad seleccionada.
- Los resúmenes y vistas de recetas guardadas usan la misma unidad persistida.
- Para registros fitosanitarios historicos sin unidad se conserva el texto de
  compatibilidad `mg o ml` y no se inventa una unidad concreta.
- Si una mezcla nueva combina unidades distintas, el PDF conserva los totales
  por producto y no presenta una suma agregada con una unidad falsa.
- Los valores legacy de fertilizacion (`Kg` y `L`) siguen siendo legibles; las
  recetas nuevas escriben las abreviaturas canonicas en minusculas.

### RNF-001: Compatibilidad offline

- La migracion SQLite es aditiva y no recrea tablas ni elimina pendientes.
- Los reintentos de outbox conservan la unidad seleccionada y mantienen la
  idempotencia actual de la receta.
- API y mobile pueden desplegarse de forma escalonada porque el nuevo campo
  fitosanitario es nullable y opcional en el contrato.

## Contratos afectados

- **Mobile UI**: selectores y validacion de dosis en fitosanidad y
  fertilizacion.
- **Mobile types/repository**: `RecetaFitosanidad.unidadDosis` y persistencia
  SQLite.
- **Sync outbox**: `mezclas[].productos[].unidadDosis`.
- **API DTO**: `FitosanidadProductoDto.unidadDosis` opcional y validado.
- **PostgreSQL**: nueva columna nullable en
  `visita_receta_fitosanidad`.
- **PDF compartido**: etiquetas de dosis y total con unidad persistida.

## Seguridad y datos

- No cambia autorizacion, roles ni autenticacion.
- La unidad no contiene datos personales ni secretos.
- La validacion de API usa una lista cerrada de valores canonicos y conserva
  compatibilidad con clientes anteriores que no envian el campo.

## Migracion y rollback

### Avance

1. PostgreSQL: agregar `unidad_dosis varchar(30) NULL` a
   `visita_receta_fitosanidad` mediante migracion aditiva.
2. API: aceptar, guardar y devolver `unidadDosis` sin exigirlo a clientes
   anteriores.
3. SQLite: agregar `unidad_dosis TEXT NULL` sin reconstruir la tabla.
4. Mobile: persistir y sincronizar la unidad; exigirla en la UI para nuevas
   dosis.
5. PDF y resúmenes: mostrar la unidad persistida y aplicar el fallback
   historico.

### Rollback

- Revertir mobile y API a la version anterior; la columna nullable queda
  ignorada sin afectar recetas existentes.
- La eliminacion fisica de columnas no forma parte del rollback operativo. Si
  se decide contraer el esquema, se hara en una migracion posterior despues de
  verificar que no existen clientes que dependan del campo.
- SQLite conserva la columna adicional para evitar recrear tablas con datos
  offline pendientes.

## Criterios de aceptacion

- [x] CA-001: Fitosanidad permite seleccionar `mg`, `g`, `kg`, `ml` o `l` por
      producto.
- [x] CA-002: Fertilizacion liquida permite solamente `ml` o `l`.
- [x] CA-003: Fertilizacion solida permite solamente `mg`, `g` o `kg`.
- [x] CA-004: La formula y el valor numerico no cambian al seleccionar una
      unidad.
- [x] CA-005: Guardar offline, cerrar y reabrir la app conserva la unidad.
- [x] CA-006: La sincronizacion envia y recupera la unidad sin duplicar la
      receta.
- [x] CA-007: El PDF compartido muestra dosis y total con la unidad escogida.
- [x] CA-008: Las recetas historicas sin unidad fitosanitaria siguen siendo
      visibles con el texto de compatibilidad.
- [x] CA-009: Un cliente mobile anterior puede crear recetas omitiendo el nuevo
      campo fitosanitario.

## Pruebas

- Unitarias de opciones permitidas y limpieza de unidad al cambiar el tipo de
  fertilizante.
- Unitarias de calculo para demostrar que la formula no cambia.
- Repositorio SQLite: guardar y restaurar la unidad fitosanitaria y
  fertilizante.
- Contrato y servicio API: aceptar, persistir y devolver `unidadDosis`.
- Migraciones PostgreSQL y SQLite sobre esquemas anteriores.
- Offline-online: crear una receta sin red, sincronizar y volver a consultarla.
- PDF: verificar unidades seleccionadas y fallback historico.
- Validacion manual de los selectores en Android.

## Impacto documental

- [x] Actualizar `docs/domain/data-model.md` al implementar la columna y los
      valores canonicos.
- [x] Actualizar la Spec 029 para enlazar esta ampliacion sin reescribir su
      historia.
- [x] Actualizar OpenAPI mediante los DTOs ejecutables.
- [x] Revisar `docs/operations/risk-register.md` al cerrar la implementacion.
- [x] No requiere ADR ni cambios de arquitectura general.
