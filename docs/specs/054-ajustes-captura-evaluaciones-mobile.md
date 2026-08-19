---
title: Ajustes de captura en evaluaciones mobile
status: implemented
numero: "054"
area: mobile, api, sync, evaluaciones, labores culturales
created: 2026-08-19
approved_by: usuario, 2026-08-19
implemented_in: apps/mobile/src/modules/evaluaciones; apps/mobile/src/modules/observaciones-sanitarias; apps/mobile/src/modules/labores-culturales-visita; apps/mobile/src/modules/visita-calificaciones; apps/api/src/modules/visita-evaluaciones, 2026-08-19
---

# Spec 054: Ajustes de captura en evaluaciones mobile

## Contexto

Los pasos de Plagas, Enfermedades, Nutricion y Labores muestran campos libres
de observacion o recomendacion que ya no deben editarse en esas vistas. Las
categorias de Labores ocupan demasiado espacio al mostrar todas sus opciones a
la vez. En Nutricion, el tecnico no debe elegir manualmente el organo afectado:
si registra una incidencia, incluido 0%, la aplicacion debe usar Hoja tierna
como valor inicial.

## Alcance

### Incluido

- Ocultar los campos editables de observacion y recomendacion en Plagas,
  Enfermedades, Nutricion y Labores sin borrar valores historicos.
- Mantener sin cambios la observacion de Riego y el resumen de recomendaciones
  de la visita anterior.
- Comprimir cada categoria de Labores en una tarjeta expandible.
- Ocultar el selector de organos de Nutricion y usar `hoja_tierna` cuando una
  incidencia entre 0 y 100 no tenga un organo previo.
- Permitir que la API conserve organos nutricionales cuando la incidencia sea
  0%.

### Excluido

- Eliminar columnas, tablas, endpoints, tipos de outbox o datos historicos.
- Cambiar la captura de organos en Plagas o Enfermedades.
- Modificar la evaluacion de Riego, los scores o sus justificaciones.

## Requisitos

- RF-001: Los cuatro modulos indicados no muestran inputs de observacion o
  recomendacion, pero al guardar conservan los textos existentes.
- RF-002: `ComplianceScoreCard` permite ocultar su observacion por pantalla y
  la mantiene visible por defecto para Riego.
- RF-003: Las categorias de Labores inician colapsadas cuando existe mas de una,
  permiten expansion independiente y muestran seleccion y estado en el resumen.
- RF-004: Nutricion no muestra el selector de organos.
- RF-005: Una incidencia nutricional ingresada, incluido 0%, usa
  `hoja_tierna` solo cuando la evaluacion no tiene organos; los valores
  historicos diferentes se conservan.
- RF-006: Al borrar la incidencia nutricional se limpian severidad y organos.
- RF-007: API conserva `organosAfectados` para una evaluacion nutricional con
  incidencia 0 y sigue aceptando un arreglo vacio de clientes anteriores.
- RNF-001: No cambian el esquema SQLite/PostgreSQL, el formato del DTO ni el
  orden, reintentos o idempotencia del outbox.

## Contratos afectados

El DTO de evaluaciones y su respuesta mantienen la misma forma. Cambia solo la
semantica de `organosAfectados`: la API deja de vaciar el arreglo de manera
forzada cuando `incidencePercentage` es 0. `ComplianceScoreCard` agrega una
opcion interna para controlar la visibilidad de su input de observacion.

## Seguridad y datos

No cambian permisos ni se agregan datos personales. Los textos historicos
ocultos se conservan y no se registran en logs.

## Migracion y rollback

No hay migraciones. Se despliega primero la API compatible y despues mobile.
Clientes anteriores siguen aceptados. El rollback de mobile vuelve a mostrar
los campos; el rollback de API puede volver a vaciar organos con incidencia 0
sin producir errores de contrato.

## Criterios de aceptacion

- [x] CA-001: Los cuatro pasos no muestran observacion/recomendacion y Riego si.
- [x] CA-002: Guardar un paso conserva cualquier texto historico oculto.
- [x] CA-003: Labores inicia comprimido y cada categoria expande sus opciones.
- [x] CA-004: Nutricion no muestra el selector de organos.
- [x] CA-005: Incidencias nutricionales 0-100 asignan Hoja tierna si falta organo.
- [x] CA-006: La API conserva Hoja tierna con incidencia 0 y acepta `[]`.
- [x] CA-007: El flujo offline-online conserva payload, orden e idempotencia.

## Pruebas

- unitarias de normalizacion nutricional y servicio API;
- pruebas del repositorio/sync afectado;
- lint, typecheck, test, docs check y builds de API/mobile;
- validacion visual final pendiente en dispositivo de los cuatro pasos y Riego.

## Impacto documental

- [x] Arquitectura.
- [x] Dominio.
- [x] Runbook: no aplica.
- [x] ADR: no aplica.
- [x] Variables o despliegue: orden API antes de mobile documentado.
