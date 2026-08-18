---
title: Busqueda y seleccion bidireccional en recetas mobile
status: implemented
numero: "052"
area: mobile, recetas, ux, catalogos
created: 2026-08-18
approved_by: usuario, 2026-08-18
implemented_in: apps/mobile/src/modules/visita-recetas/presentation/screens/visita-receta-selection.ts; apps/mobile/src/modules/visita-recetas/presentation/screens/visita-receta-screen.tsx, 2026-08-18
---

# Spec 052: Busqueda y seleccion bidireccional en recetas mobile

## Contexto

Los selectores de receta no exponen busqueda aunque `AppSelectField` ya puede
filtrar texto sin distinguir mayusculas ni tildes. En fitosanidad, Nombre
comercial exige elegir antes el ingrediente activo, lo que impide comenzar por
una marca conocida por el tecnico.

## Alcance

### Incluido

- Busqueda local en tipo de producto fitosanitario, ingrediente activo, Nombre
  comercial y fertilizante.
- Apertura de Nombre comercial despues de elegir el tipo de producto.
- Listado de todas las marcas del tipo cuando no se eligio ingrediente y
  mantenimiento del filtro por ingrediente cuando este se elige primero.
- Ingrediente activo como texto auxiliar de cada marca.
- Resolucion marca a ingrediente, concentracion y unidad mediante funciones
  puras fuera del componente visual.
- Exclusion del flujo inverso de marcas sin relacion con un ingrediente vigente.

### Excluido

- Busqueda para las listas cortas restantes, incluido el selector Solido/Liquido.
- Nuevas librerias o cambios de API, PostgreSQL, SQLite, outbox y contratos
  persistidos.
- Guardado de IDs de ingrediente o marca dentro de la receta.

## Requisitos

- RF-001: Tipo de producto sigue siendo el primer requisito de la seleccion
  fitosanitaria.
- RF-002: Los cuatro selectores incluidos filtran localmente por texto sin
  distinguir mayusculas ni tildes.
- RF-003: Sin ingrediente seleccionado, Nombre comercial lista las marcas del
  tipo que referencian un ingrediente existente.
- RF-004: Con ingrediente seleccionado, Nombre comercial lista solo sus marcas
  compatibles para el tipo actual.
- RF-005: Cada opcion de Nombre comercial muestra el nombre del ingrediente
  relacionado y ese texto tambien participa en la busqueda.
- RF-006: Elegir una marca completa ingrediente activo, nombre comercial,
  concentracion y unidad.
- RF-007: Elegir primero un ingrediente conserva la limpieza de valores
  incompatibles y las autoselecciones cuando solo existe una opcion.
- RF-008: Cambiar el tipo limpia ingrediente, marca, concentracion y unidad
  incompatibles.
- RNF-001: El cambio funciona offline, no agrega dependencias y es distribuible
  mediante OTA.
- RNF-002: Recetas historicas, borradores y operaciones pendientes conservan su
  formato y compatibilidad.

## Contratos afectados

Solo cambia la interaccion del formulario y las funciones puras internas de
seleccion en mobile. La receta continua persistiendo nombres, concentracion y
unidad con el contrato existente. API, SQLite, PostgreSQL, outbox y tipos
compartidos no cambian.

## Seguridad y datos

La busqueda se ejecuta en memoria sobre catalogos ya disponibles en el
dispositivo. No transmite consultas, no incorpora datos sensibles y no cambia
permisos ni aislamiento por usuario.

## Migracion y rollback

No requiere migracion. El avance se distribuye como cambio JavaScript/TypeScript
compatible con OTA. El rollback consiste en revertir el codigo y la
documentacion; no hay datos que restaurar.

## Criterios de aceptacion

- [x] CA-001: Un tipo sin ingrediente muestra todas sus marcas con relacion
      valida y excluye marcas de otro tipo o sin ingrediente vigente.
- [x] CA-002: Tipo e ingrediente seleccionados mantienen el filtro de marcas
      compatible.
- [x] CA-003: Elegir primero una marca completa el ingrediente correcto,
      concentracion y unidad.
- [x] CA-004: Cambiar tipo o ingrediente limpia datos incompatibles y conserva
      las autoselecciones de una sola opcion.
- [x] CA-005: Tipo, ingrediente, Nombre comercial y fertilizante permiten buscar
      por texto sin distinguir mayusculas ni tildes.
- [x] CA-006: El selector Solido/Liquido permanece como lista corta sin busqueda.
- [x] CA-007: No cambian persistencia, sincronizacion ni contratos remotos.

## Pruebas

- unitarias de filtros por tipo e ingrediente y exclusion de relaciones invalidas;
- unitarias de seleccion marca a ingrediente, concentracion y unidad;
- regresion de limpieza y autoseleccion al cambiar tipo o ingrediente;
- validacion manual de busqueda por texto, mayusculas y tildes en los cuatro
  selectores;
- suite mobile, lint, typecheck, formato y validacion documental.

## Impacto documental

- [x] Arquitectura: documentar la seleccion de catalogos de receta en mobile.
- [x] Dominio: sin cambio de reglas persistidas.
- [x] Runbook: sin cambios operativos.
- [x] ADR: no corresponde.
- [x] Variables o despliegue: OTA compatible, sin variables nuevas.
