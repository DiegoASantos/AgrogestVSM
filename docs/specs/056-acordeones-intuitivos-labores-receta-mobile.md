---
title: Acordeones intuitivos en labores y receta mobile
status: implemented
numero: "056"
area: mobile, labores culturales, recetas, ux, accesibilidad
created: 2026-08-19
approved_by: usuario, 2026-08-19
implemented_in: apps/mobile/src/shared/components; apps/mobile/src/modules/labores-culturales-visita/presentation; apps/mobile/src/modules/visita-recetas/presentation/screens, 2026-08-19
---

# Spec 056: Acordeones intuitivos en labores y receta mobile

## Contexto

Las categorias comprimidas de Labores Culturales no indican con suficiente
claridad como desplegar sus opciones y, cuando existen varias categorias,
ninguna se abre inicialmente. En Receta, Hallazgos consolidados, Riego y
Labores permanecen extendidos y alargan la pantalla.

## Alcance

### Incluido

- Unificar las senales visuales y accesibles de tarjetas abiertas y cerradas.
- Guiar Labores Culturales por la primera categoria sin seleccion.
- Comprimir Hallazgos consolidados, Riego y Labores dentro de Receta.
- Usar `Sin registros` solo cuando no existe seleccion e `Incompleto` cuando
  una recomendacion contiene datos parciales.

### Excluido

- Hacer obligatorios Riego o Labores dentro de Receta.
- Cambiar API, SQLite, borradores, outbox, payloads o reglas de sincronizacion.
- Agregar una opcion `No aplica` o animaciones nuevas.

## Requisitos

- RF-001: Toda cabecera colapsable muestra titulo, resumen, estado textual,
  chevron y la accion `Ver opciones` u `Ocultar opciones`.
- RF-002: Labores Culturales mantiene una sola categoria abierta, inicia en la
  primera sin registros y avanza a la siguiente al completar la actual.
- RF-003: Una categoria de Labores Culturales permite quitar explicitamente su
  seleccion y permanece abierta al hacerlo.
- RF-004: Hallazgos, Riego y Labores de Receta inician cerrados y se expanden
  de forma independiente del acordeon exclusivo de recomendaciones.
- RF-005: Riego y Labores de Receta muestran `Sin registros · Opcional` sin
  bloquear el guardado; al seleccionar resumen la recomendacion registrada.
- RF-006: Las recomendaciones existentes muestran `Completo` o `Incompleto`,
  sin usar `Pendiente` para datos parciales.
- RNF-001: El area tactil es al menos 48 dp y expone rol, nombre y estado
  `expanded` a tecnologias de asistencia.
- RNF-002: Los estados de expansion son efimeros y no se persisten.

## Contratos afectados

Solo se agregan props y helpers internos de presentacion. No cambian contratos
publicos, tipos compartidos ni datos persistidos.

## Seguridad y datos

No cambian permisos, secretos ni datos personales. Colapsar contenido no
descarta selecciones ni modifica la receta.

## Migracion y rollback

No hay migraciones ni orden especial de despliegue. El rollback restaura el
render previo; los datos creados durante esta version mantienen compatibilidad.

## Criterios de aceptacion

- [x] CA-001: Labores Culturales abre y guia la primera categoria sin registros.
- [x] CA-002: Las cabeceras distinguen abierta/cerrada mediante texto e icono.
- [x] CA-003: Hallazgos, Riego y Labores de Receta inician comprimidos.
- [x] CA-004: Riego y Labores siguen siendo opcionales y muestran su resumen.
- [x] CA-005: No se usa `Pendiente` para secciones sin seleccion o datos parciales.
- [x] CA-006: Guardado, borradores y sincronizacion conservan su comportamiento.

## Pruebas

- unitarias del flujo guiado y los resumenes de Receta;
- regresion de acordeones de recomendaciones;
- lint, typecheck, suite global, docs check y build mobile;
- validacion visual y accesible en telefono pequeno.

## Impacto documental

- [x] Arquitectura: actualizado `docs/architecture/mobile-offline-sync.md`.
- [x] Dominio: sin cambios.
- [x] Runbook: no aplica.
- [x] ADR: no aplica.
- [x] Variables o despliegue: sin cambios.
