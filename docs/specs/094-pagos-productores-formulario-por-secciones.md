---
title: Formulario de pagos de productores por secciones
status: implemented
numero: "094"
area: admin-web, api, comercial, seguridad
created: 2026-10-08
approved_by: usuario (instrucción "Implement the plan", 2026-10-08)
implemented_in: apps/admin-web/src/modules/pagos, apps/api/src/modules/comercial
---

# Spec 094: Formulario de pagos de productores por secciones

## Contexto

La captura de pagos de productores se realiza en modales separados para la
cabecera y cada detalle. El formulario de detalle requiere muchos campos, hace
difícil comparar y registrar varias líneas y no facilita vincular un acreedor
faltante al productor seleccionado.

## Alcance

### Incluido

- Vistas dedicadas para crear y editar pagos, manteniendo el listado actual.
- Dos secciones plegables: cabecera del pago y detalles por acreedor.
- Varias tarjetas de detalle en una sección con guardado atómico del conjunto.
- Búsqueda de acreedores aprobados del productor y alta rápida desde el pago.
- Selección de supervisores limitada a usuarios activos con rol `AGRONOMO`.
- Reutilización de las columnas actuales de tipo y número de documento del
  detalle, tratándolas desde este cambio como documento del acreedor incluso
  para los registros existentes.

### Excluido

- Cálculo automático de importes, porcentajes o pesos.
- Cambios mobile/offline, otras pestañas de Pagos y despliegues.
- Nuevas tablas o columnas en PostgreSQL.

## Requisitos

- RF-001: `ADMIN` y `ANALISTA` pueden acceder a las vistas de crear y editar;
  la API mantiene autorización de servidor para toda lectura y mutación.
- RF-002: La vista de creación inicia con Cabecera expandida y Detalles
  bloqueada hasta guardar la cabecera. Ambas secciones pueden expandirse o
  contraerse; la vista de edición carga cabecera y detalles existentes.
- RF-003: Cabecera contiene productor, sistema de origen, número de guía, lote,
  protocolo, variedad, tipo de cultivo, categoría, destino, fechas de cosecha y
  recepción, jabas, pesos bruto/tara/neto/promedio, exportador, código y nombre
  del productor de origen. Guardar la cabecera conserva estados y validaciones
  de la Spec 092.
- RF-004: Detalles muestra una tarjeta por línea, plegable y con resumen visible
  al cerrarla. Los campos se agrupan en acreedor/documento, supervisor y
  liquidación/descuentos. Conserva los campos actuales: Fairtrade, monto de
  descuento y total después del descuento, además de los campos solicitados en
  el formulario.
- RF-005: Las opciones de acreedor pertenecen al productor de la cabecera y
  solo incluyen perfiles `APPROVED`. El selector permite buscar por nombre o
  documento. Elegir un acreedor completa tipo y número de documento en campos
  de solo lectura.
- RF-006: Si no existe el acreedor requerido, la vista permite abrir un modal
  de alta rápida para ese productor. La acción explícita “Crear y aprobar”
  valida los mismos datos y duplicados que el mantenimiento, guarda el origen
  `ADMIN_WEB`, marca el perfil `APPROVED` y registra al actor y la decisión en
  `revisiones_acreedor_cosecha` dentro de una transacción. Al terminar queda
  disponible para seleccionarlo en el detalle.
- RF-007: El catálogo de supervisores solo devuelve usuarios activos con rol
  `AGRONOMO`. La API vuelve a comprobar rol y vigencia al guardar cada detalle.
- RF-008: La sección Detalles guarda altas, ediciones y anulaciones de varias
  tarjetas mediante una sola solicitud transaccional. Si una operación falla,
  no se aplica ninguna. No exige que el porcentaje de peso de las líneas sume
  100 y mantiene el rango individual de 0 a 100.
- RF-009: Un detalle nuevo queda `PENDIENTE`; el primer detalle guardado cambia
  la cabecera de `BORRADOR` a `PENDIENTE`. Los estados posteriores siguen
  siendo independientes. Una línea anulada conserva su historial y no se
  reactiva. Un pago anulado no admite cambios.
- RF-010: Los importes, pesos, jabas y descuentos se guardan tal como se
  ingresan. Fairtrade, monto y total de descuento permanecen disponibles; no
  se derivan subtotales ni detracciones.
- RF-011: Se conservan los documentos persistidos en las columnas existentes
  `tipo_documento_id_productor` y `nro_documento_productor`, pero la interfaz y
  el contrato nuevo los interpretan como documento del acreedor. No se
  transforman ni eliminan datos históricos.
- RF-012: No se impide que el mismo acreedor aparezca en más de una tarjeta;
  se mantiene el comportamiento permitido por el modelo actual.
- RNF-001: Errores de validación de detalle identifican la tarjeta afectada sin
  incluir documentos, cuentas ni datos sensibles en logs o telemetría.
- RNF-002: Respuestas con datos de identidad y cuentas usan `Cache-Control:
no-store`; guards, `RolesGuard` y `AllowAnalystMutation` cubren las nuevas
  mutaciones.

## Contratos afectados

- Web: `/pagos/productores/nuevo` y `/pagos/productores/:id/editar`; el listado
  `/pagos` enlaza a ambas vistas.
- API: extender `GET /pagos/productores/:id/acreedores-aprobados` con tipo y
  número de documento; agregar alta rápida aprobada bajo el pago y una ruta de
  lote para altas, ediciones y anulaciones de detalles.
- API: la ruta de lote recibe operaciones identificadas por UUID público,
  valida cada acreedor/supervisor y devuelve el conjunto actualizado. Las rutas
  existentes de detalle individual permanecen disponibles. Los nombres
  semánticos `tipoDocumentoAcreedor` y `nroDocumentoAcreedor` se aceptan en el
  contrato nuevo; se conservan las propiedades anteriores para compatibilidad.
- PostgreSQL: no hay migración. La entidad conserva las columnas actuales; el
  servicio mapea a ellas el documento real del acreedor seleccionado.

## Seguridad y datos

Los actores siguen siendo `ADMIN` y `ANALISTA`. El frontend no sustituye la
autorización de API. La alta rápida confirma explícitamente que el acreedor será
aprobado, valida productor, documento y unicidad natural, y registra la
revisión con el usuario autenticado. La asignación de detalle vuelve a validar
que el acreedor aprobado pertenezca al productor del pago.

Los documentos se completan desde el acreedor seleccionado y no son editables
en la tarjeta. El selector y las respuestas no exponen información bancaria
que no se necesite para esta captura. Los errores visibles no contienen
valores sensibles.

## Migración y rollback

No se modifica el esquema ni se reescriben filas existentes. El contrato de
lote y la alta rápida son aditivos; las operaciones escriben en las tablas ya
usadas por Pagos y Acreedores. El rollback consiste en retirar las nuevas
vistas y rutas de lote/alta rápida; las cabeceras, detalles y revisiones creadas
siguen siendo legibles por las rutas actuales. No se requiere despliegue mobile
ni migración de datos.

## Criterios de aceptación

- [x] CA-001: Crear y editar usan vistas propias; la cabecera y los detalles se
      pueden expandir y contraer sin perder cambios pendientes.
- [x] CA-002: La sección Detalles permite agregar varias tarjetas, revisar un
      resumen por acreedor y guardar todas las operaciones atómicamente.
- [x] CA-003: Si falla una tarjeta, la API revierte el lote completo y la UI
      conserva los valores ingresados e identifica el error.
- [x] CA-004: Cambiar el productor refresca acreedores; en edición no se puede
      cambiar si ya existen detalles, conforme a la regla actual de API.
- [x] CA-005: Documento del acreedor se autocompleta y es de solo lectura; la
      alta rápida lo crea aprobado con una revisión auditable y lo deja
      seleccionable.
- [x] CA-006: Supervisores contiene solo usuarios activos `AGRONOMO`; la API
      rechaza cualquier UUID sin ese rol vigente.
- [x] CA-007: Las cifras permanecen manuales y sin cálculos; los valores
      históricos se muestran como documento del acreedor según esta decisión.
- [x] CA-008: Estados, anulaciones, compatibilidad de rutas previas y límites
      de campos siguen las reglas de la Spec 092.
- [x] CA-009: Un rol sin permiso recibe rechazo de API; no se registran valores
      de documento o cuenta en logs.

## Pruebas

- Unitarias de servicio para lote transaccional, rollback, estados, acreedor
  aprobado y perteneciente al productor, supervisor `AGRONOMO`, alta rápida y
  registro de revisión.
- Pruebas de autorización para cada nueva mutación con `ADMIN`, `ANALISTA` y un
  rol no autorizado.
- Pruebas web de rutas, acordeones, creación/edición de tarjetas, búsqueda,
  autocompletado de documento y conservación de entradas cuando falla el lote.
- Verificación manual responsive del formulario con varios detalles y revisión
  de que no se muestran cuentas bancarias innecesarias.

## Impacto documental

- [x] Arquitectura: registrar las rutas de formulario y las operaciones API.
- [x] Dominio: aclarar documento de acreedor y guardado de detalles por lote.
- [ ] Runbook: sin cambios previstos.
- [ ] ADR: no se requiere.
- [ ] Variables o despliegue: sin cambios previstos; no desplegar en esta tarea.
