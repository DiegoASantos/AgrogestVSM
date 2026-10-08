---
title: Guardado único y detalle simplificado de pagos de productores
status: implemented
numero: "095"
area: admin-web, api, comercial, seguridad
created: 2026-10-08
approved_by: usuario (instrucción "Implement the plan", 2026-10-08)
implemented_in: apps/api/src/modules/comercial, apps/admin-web/src/modules/pagos
---

# Spec 095: Guardado único y detalle simplificado de pagos de productores

## Contexto

La vista actual guarda cabecera y detalles con botones y solicitudes distintas.
Esto permite pagos incompletos y hace que el usuario repita operaciones. El
detalle separa búsqueda y elección de acreedor y distribuye demasiados campos
en dos columnas.

## Alcance

### Incluido

- Un único formulario y botón Guardar pago para cabecera y detalles.
- Persistencia atómica de cabecera, altas, ediciones y anulaciones de detalles.
- Al menos un detalle activo por pago guardado desde la nueva vista.
- Acreedores aprobados consultables antes de crear el pago, filtrados por
  productor; búsqueda y selección en un único control.
- Cuatro controles en la primera fila del detalle: acreedor, documento de solo
  lectura, supervisor agrónomo y Fairtrade.
- Doce campos restantes en tres columnas de escritorio, dos de tableta y una
  de móvil; color moderado y contraste en modo oscuro.

### Excluido

- Cálculo automático de importes, cambios de esquema, cambios mobile y alta
  rápida de acreedores en el formulario.
- Despliegue a producción sin autorización específica.

## Requisitos

- RF-001: `POST /pagos/productores/completo` recibe `cabecera` y una lista no
  vacía de `detalles` y guarda todo en una transacción. Un error revierte todo.
- RF-002: `PATCH /pagos/productores/:id/completo` recibe `cabecera`, detalles
  nuevos o con UUID y `anularIds`; aplica todo en una transacción. Rechaza
  duplicados, referencias ajenas y resultado sin detalles activos.
- RF-003: `GET /pagos/acreedores-aprobados?productorId=<UUID>` devuelve solo
  identidad y documento de acreedores aprobados del productor existente.
- RF-004: Las rutas previas permanecen disponibles; el formulario usa solo las
  rutas completas. Las cifras ingresadas siguen siendo manuales.
- RF-005: El selector de supervisor muestra usuarios activos `AGRONOMO`; la
  API vuelve a comprobar rol y actividad en cada guardado.
- RF-006: La vista conserva borradores ante error y muestra la tarjeta que
  causó un fallo. El cambio de productor limpia acreedores elegidos.
- RNF-001: Respuestas con datos personales usan `Cache-Control: no-store`.
  Mutaciones requieren `ADMIN` o `ANALISTA` con el permiso vigente.

## Contratos afectados

Los tres endpoints aditivos anteriores. `cabecera` usa los DTO actuales de
creación/edición. Cada elemento de `detalles` usa el DTO actual de detalle, con
`id` y `estado` opcionales en edición. El resultado contiene cabecera y lista
de detalles. No hay migración ni cambio de columnas.

## Seguridad y datos

Los guards de API siguen siendo la frontera de autorización. La API comprueba
que cada acreedor esté aprobado y pertenezca al productor; valida supervisor
activo con rol agrónomo. El lookup no devuelve banco ni cuenta. Los errores
identifican índice de detalle sin incluir documento ni cuenta.

## Migración y rollback

Publicar API antes o junto con web. Los endpoints anteriores siguen sirviendo
a clientes existentes. La reversión de las rutas y la vista no requiere
transformar datos: los pagos guardados son legibles por los endpoints previos.

## Criterios de aceptación

- [x] CA-001: Un botón guarda ambas secciones y exige un detalle activo.
- [x] CA-002: Error en cualquier detalle no deja cabecera ni cambios parciales.
- [x] CA-003: Selector único busca nombre y documento; documento es solo lectura.
- [x] CA-004: Distribución 4 + 3 columnas se adapta a tableta, móvil y modo oscuro.
- [x] CA-005: Se preservan rutas previas, estados y controles de acceso.

## Pruebas

- Unitarias de transacción, rollback y rechazo de pago sin detalle activo.
- Validación de DTO, acreedor aprobado, supervisor y autorización.
- Typecheck, lint y build de las apps afectadas; revisión responsive y de tema.

## Impacto documental

- [x] Arquitectura: registrar endpoints y flujo completo.
- [x] Dominio: registrar atomicidad de la nueva vista.
- [ ] Runbook: sin cambio operativo.
- [ ] ADR: no requerido.
- [ ] Variables o despliegue: sin variables nuevas.
