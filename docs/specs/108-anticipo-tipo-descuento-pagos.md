---
title: Anticipo como tipo de descuento en pagos de productores
status: implemented
numero: 108
area: api, admin-web, comercial
created: 2026-10-14
approved_by: usuario mediante solicitud explícita de añadir Anticipo, 2026-10-14
implemented_in: API Comercial DTO y cálculo; admin-web formulario de pago; documentación de dominio
---

# Spec 108: Anticipo como tipo de descuento en pagos de productores

## Contexto

El selector de tipo de descuento de los detalles de pago ofrece No aplica, CLP,
Insumos y Comisión. Se requiere registrar también Anticipo.

## Alcance

### Incluido

- Mostrar Anticipo en el selector de detalle de Nuevo pago y Editar pago.
- Aceptar y persistir el código `ANTICIPO` en la API, con las reglas existentes
  de monto positivo, cálculo del total y lectura de detalles.

### Excluido

- Cambios al esquema de base de datos, pagos históricos o app móvil.
- Cambios a la fórmula del descuento o a los otros tipos.

## Requisitos

- RF-001: El selector muestra `Anticipo` y envía `ANTICIPO`.
- RF-002: La API acepta `ANTICIPO` y exige `montoDescuento` mayor que cero y no
  superior al importe bruto, igual que CLP, Insumos y Comisión.
- RF-003: Al abrir un detalle guardado con `ANTICIPO`, el selector conserva esa
  opción y sus importes sin alterar otras líneas.
- RNF-001: Los clientes previos y los valores históricos siguen siendo legibles.

## Contratos afectados

Se amplía el enum documentado y validado de `tipoDescuento` en los endpoints de
detalle de pago. El valor persistido es `ANTICIPO` en la columna varchar actual.

## Seguridad y datos

Se conservan autorización, validación y cálculo del lado de la API. No se
agregan datos personales ni campos sensibles.

## Migración y rollback

No se requiere migración: `tipo_descuento` admite el valor nuevo. Desplegar API
antes o junto con web. Para rollback, volver a la versión anterior de API y web;
los detalles ya guardados con `ANTICIPO` permanecen legibles como valor histórico,
pero no podrán editarse con la API anterior sin cambiar el tipo.

## Criterios de aceptación

- [x] CA-001: La web ofrece Anticipo y solicita monto positivo.
- [x] CA-002: La API acepta y calcula Anticipo; rechaza monto cero.
- [x] CA-003: Un detalle con Anticipo se puede volver a abrir para editar.

## Pruebas

- Pruebas unitarias de validación y cálculo del descuento.
- Lint, tipos y build de API y web; validación documental.

## Impacto documental

- [x] Dominio de pagos.
- [x] Índices de specs y documentación.
