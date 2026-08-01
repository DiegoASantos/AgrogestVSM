---
title: Reparación y recarga de concentraciones en receta mobile
status: implemented
numero: "025"
area: receta, catalogos, api, database, mobile
created: 2026-08-01
approved_by: usuario, 2026-08-01
implemented_in: apps/api, apps/mobile y docs, 2026-08-01
---

# Spec 025: Reparación y recarga de concentraciones en receta mobile

## Contexto

La spec 024 incorporó concentración y unidad a los catálogos de receta. En una
base existente, el update de `marcas_producto` dependía además de resolver por
nombre el tipo de producto y el ingrediente activo. Esa condición permitía que
la migración terminara sin error pero dejara vacíos los nuevos datos de una marca
ya existente. Mobile también podía abrir la receta con el caché anterior y no
releer SQLite cuando la descarga de catálogos terminaba en segundo plano.

Esta spec corrige ambos defectos y referencia la fuente de datos de la spec 024;
no vuelve a definir ni duplicar el catálogo de productos.

## Alcance

### Incluido

- Actualizar concentración y unidad de marcas existentes únicamente por nombre
  normalizado, sin depender de otras relaciones.
- Reutilizar la única fuente DML de la migración 037 mediante una migración
  correctiva 038, sin repetir sus cambios de esquema.
- Verificar al arrancar la API que ambos catálogos tengan una cantidad mínima de
  filas con concentración y unidad.
- Invalidar nuevamente el caché mobile mediante la migración SQLite 50.
- Releer los catálogos en la receta abierta cuando termina una descarga y
  completar la selección ya realizada.
- Mostrar un mensaje preciso cuando una marca seleccionada carezca realmente de
  concentración.

### Excluido

- Cambiar los 21 productos fitosanitarios o 15 fertilizantes definidos en la
  spec 024.
- Borrar cachés, recetas, outbox o información histórica.
- Operar manualmente la base de producción.

## Requisitos

- RF-001: Una marca existente recibe concentración y unidad aunque su tipo o
  ingrediente no pueda resolverse durante la reparación.
- RF-002: La migración correctiva reutiliza una sola definición del catálogo,
  omite el DDL ya aplicado y no inserta nombres ya existentes.
- RF-003: El arranque de API falla de forma explícita si quedan menos de 21
  marcas o 15 fertilizantes con ambos datos.
- RF-004: Mobile fuerza una descarga posterior a SQLite 50 sin tocar datos
  operativos.
- RF-005: Una receta abierta actualiza sus catálogos y la concentración visible
  al finalizar la descarga, sin exigir cerrar y volver a abrir la pantalla.
- RNF-001: No cambia el contrato API, el payload de receta ni el outbox.
- RNF-002: La corrección es idempotente y compatible con clientes anteriores.

## Contratos afectados

No cambia el contrato definido por la spec 024. PostgreSQL agrega únicamente el
registro de migración 038; SQLite avanza de versión 49 a 50 sin cambios de
esquema.

## Seguridad y datos

No cambian permisos, secretos ni datos personales. La reparación actualiza por
`lower(trim(nombre))`, conserva `NOT EXISTS` para inserts y no elimina filas.

## Migración y rollback

1. Desplegar la API para ejecutar 038 y validar los mínimos del catálogo.
2. Publicar mobile con SQLite 50 para invalidar una vez el caché anterior.
3. La descarga normal repuebla las columnas y notifica a la receta abierta.

Rollback operativo: conservar 038 y SQLite 50 por ser correctivos y aditivos;
revertir solo la suscripción visual si causa un defecto, sin borrar datos.

## Criterios de aceptación

- [x] CA-001: El update de concentración/unidad no contiene joins obligatorios.
- [x] CA-002: La migración 038 reutiliza el DML corregido de 037 sin repetir DDL.
- [x] CA-003: El runner valida al menos 21 marcas y 15 fertilizantes completos.
- [x] CA-004: SQLite 50 invalida el caché sin modificar recetas ni outbox.
- [x] CA-005: Una selección existente se completa al terminar la descarga.
- [x] CA-006: Si el dato sigue ausente, el mensaje ya no pide seleccionar un
      nombre comercial que ya está seleccionado.

## Pruebas

- migraciones PostgreSQL 037/038 y validaciones de catálogo;
- migración SQLite 50 y preservación de datos offline;
- recarga de selección de receta;
- typecheck, lint, pruebas y builds focalizados.

## Impacto documental

- [x] Arquitectura offline.
- [x] Dominio: sin cambio de modelo respecto de la spec 024.
- [x] Runbook: sin cambio.
- [x] ADR: no corresponde.
- [x] Variables o despliegue: API antes que mobile.
