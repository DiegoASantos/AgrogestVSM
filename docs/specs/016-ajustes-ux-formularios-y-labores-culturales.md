---
title: Ajustes UX de formularios y valores iniciales de labores culturales
status: approved
numero: "016"
area: mobile-forms-and-field-work
created: 2026-07-15
approved_by: usuario, 2026-07-15
implemented_in: apps/mobile/src/shared/components/form-scroll-view.tsx; apps/mobile/src/modules/visita-recetas/presentation/screens/visita-receta-order.ts; apps/mobile/src/modules/labores-culturales-visita/presentation
---

# Spec 016: Ajustes UX de formularios y valores iniciales de labores culturales

## Contexto

El contenedor comun de formularios desplazaba siempre la vista al final al abrir el teclado. Ademas, el orden de mezcla debe mantener fijo solamente Agua y las seis categorias de labores requieren opciones iniciales editables.

## Alcance

### Incluido

- Eliminar el desplazamiento automatico al final del formulario al abrir el teclado.
- Mantener fijo unicamente Agua en el orden de mezcla.
- Preseleccionar: maleza limpio, suelo limpio, ramas improductivas bajo, riesgo de quiebre bajo, copa buena y balance equilibrado.
- Mostrar un aviso para revisar y editar las opciones iniciales.

### Excluido

- Cambios de esquema, API, sincronizacion o catalogos.
- Sobrescribir labores culturales previamente guardadas.

## Requisitos

- RF-001: Ningun formulario se desplaza automaticamente al final al abrir el teclado.
- RF-002: Solo Agua es fija; los demas elementos pueden intercambiarse.
- RF-003: Los valores iniciales se obtienen con `categoryCode` y `optionCode`.
- RF-004: Las selecciones existentes prevalecen.
- RNF-001: No se modifica el contrato offline de SQLite u outbox.

## Contratos afectados

No hay cambios de API, SQLite, PostgreSQL ni tipos compartidos.

## Seguridad y datos

No hay datos sensibles ni cambios de permisos. Las opciones iniciales se mantienen en memoria hasta que el usuario guarda.

## Migracion y rollback

No hay migracion. Revertir la interfaz no afecta registros ni outbox existentes.

## Criterios de aceptacion

- [x] CA-001: Al abrir el teclado en un campo superior no se desplaza la vista al final.
- [x] CA-002: Agua no es intercambiable; Corrector de pH y Producto agroquimico si lo son.
- [x] CA-003: Una visita sin labores guarda una opcion inicial para cada una de las seis categorias al guardar el paso.
- [x] CA-004: Una visita con labores previas conserva sus selecciones.

## Pruebas

- Unitarias para elementos fijos del orden y valores iniciales por catalogo.
- Typecheck de mobile.
- Validacion manual pendiente en dispositivo: inputs superiores de datos basicos y receta.

## Impacto documental

- [x] Arquitectura: sin cambios.
- [x] Dominio: sin cambios.
- [x] Runbook: sin cambios.
- [x] ADR: sin cambios.
- [x] Variables o despliegue: sin cambios.