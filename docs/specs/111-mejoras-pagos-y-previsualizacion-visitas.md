---
title: Reporte y navegación de pagos y previsualización de documentos de visita
status: implemented
numero: 111
area: pagos, reportes, visitas, admin-web, api
created: 2026-10-17
approved_by: usuario (Implement the plan)
implemented_in: apps/api/src/modules/comercial; apps/admin-web/src/modules/pagos; apps/admin-web/src/modules/visitas, 2026-10-17
---

# Spec 111: Reporte y navegación de pagos y previsualización de documentos de visita

## Contexto

El flujo de pagos necesita volver al listado al guardar, mostrar importes y
liquidaciones por acreedor y producir un reporte filtrable. En el detalle de
visita, los documentos actuales abren automáticamente el diálogo de impresión;
se requiere poder revisarlos antes sin iniciar esa acción.

## Alcance

### Incluido

- Volver a `/pagos` tras guardar o actualizar un pago correctamente.
- Mostrar una fila por detalle de acreedor en el listado de pagos, con total
  después de detracción y número de liquidación.
- Descargar PDF filtrable opcionalmente por productor y fecha de recepción
  desde/hasta. Cada detalle incluido aporta productor, lote, guía, fecha de
  cosecha, documento y nombre del acreedor, peso neto a pagar, precios por kilo
  y jaba y neto a cobrar. Mostrar el total general del neto a cobrar.
- Excluir pagos y detalles anulados del PDF; conservar sus estados en el
  listado web.
- Agregar previsualización de diagnóstico y receta en el detalle de visita,
  reutilizando el contenido existente sin iniciar la impresión.

### Excluido

- Cambios de esquema o datos.
- Despliegue, publicación, push o generación de APK/OTA.
- Cambios al contenido de los documentos de diagnóstico y receta.

## Requisitos

- RF-001: El guardado exitoso de alta y edición navega a `/pagos`.
- RF-002: El listado presenta los detalles como renglones con sus cabeceras y
  las columnas de total después de detracción y N.º de liquidación.
- RF-003: El PDF permite cero, uno o ambos límites de recepción y un productor
  opcional; los límites son inclusivos y un rango invertido se rechaza.
- RF-004: El PDF contiene las columnas acordadas y suma neto a cobrar; omite
  registros anulados.
- RF-005: Previsualizar diagnóstico o receta abre el mismo documento que los
  botones PDF actuales y no invoca la impresión automáticamente.
- RNF-001: El reporte queda protegido por los roles ADMIN y ANALISTA, no se
  almacena en caché y no cambia el esquema.
- RNF-002: Los filtros de fecha usan parámetros validados y las consultas no
  concatenan entrada del usuario.

## Contratos afectados

GET `/pagos/productores/reporte-pdf` acepta `productorId`, `fecha_desde` y
`fecha_hasta`, todos opcionales. La lista de pagos incluye `detalles`. No hay
cambios de SQLite, PostgreSQL ni eventos mobile.

## Seguridad y datos

El PDF contiene datos personales y financieros del productor y acreedores. Solo
ADMIN y ANALISTA pueden consultarlo; la respuesta usa `private, no-store`.

## Migración y rollback

No requiere migración. El rollback consiste en revertir el código del endpoint,
listado, formulario y botones de previsualización; no hay datos nuevos que
revertir.

## Criterios de aceptación

- [x] CA-001: Guardar alta o edición de pago redirige al listado.
- [x] CA-002: Cada detalle aparece con total post detracción y número de
      liquidación; pagos sin detalle conservan una fila.
- [x] CA-003: El PDF aplica cada filtro opcional, excluye anulados y presenta
      total general coherente con sus filas.
- [x] CA-004: Los botones de previsualización muestran el diagnóstico o receta
      sin abrir automáticamente el diálogo de impresión.

## Pruebas

- Pruebas de API: generación de PDF, filtros de productor/fechas, condiciones
  para excluir anulados y rechazo de rangos invertidos.
- Pruebas de previsualización sin `print()`; typecheck cubre la redirección y
  descarga de la interfaz.
- Typecheck, lint, pruebas dirigidas y build.
- La verificación de protección de rama no estuvo disponible en este equipo:
  falta GitHub CLI (`gh`). El despliegue usa el script operativo que valida la
  rama `produccion` y exige un árbol limpio; health y smoke tests se revisan
  después de publicar.

## Impacto documental

- [x] Arquitectura.
- [x] Dominio.
- [x] Runbook.
- [ ] ADR.
- [x] Variables o despliegue.
