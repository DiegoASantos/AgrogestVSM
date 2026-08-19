---
title: Seleccion fitosanitaria simplificada en receta mobile
status: implemented
numero: "059"
area: mobile, recetas, ux, catalogos
created: 2026-08-19
approved_by: usuario mediante aprobacion explicita del plan, 2026-08-19
implemented_in: apps/mobile/src/modules/visita-recetas/presentation/screens/visita-receta-selection.ts; apps/mobile/src/modules/visita-recetas/presentation/screens/visita-receta-screen.tsx; apps/mobile/src/modules/visita-recetas/presentation/screens/visita-receta-multiple-products.ts, 2026-08-19
---

# Spec 059: Seleccion fitosanitaria simplificada en receta mobile

## Contexto

La receta fitosanitaria exige seleccionar primero el tipo de producto aunque el
tecnico normalmente conoce el nombre comercial o el ingrediente activo. El
catalogo local ya relaciona cada nombre comercial valido con ambos datos, por
lo que ese paso puede derivarse sin cambiar contratos ni sincronizacion. El tipo
de control tampoco tiene un valor inicial aunque Quimico es el uso habitual.

## Alcance

### Incluido

- Permitir iniciar la seleccion por Nombre comercial o Ingrediente activo.
- Derivar tipo de producto, ingrediente, concentracion y unidad desde la marca.
- Autoseleccionar una marca unica y exigir eleccion cuando existan varias.
- Mostrar el tipo de producto derivado como dato de solo lectura.
- Usar Quimico como tipo de control inicial sin impedir que el usuario lo cambie.
- Conservar el ajuste que oculta Anterior y Siguiente cuando existe una mezcla.

### Excluido

- Cambios en fertilizantes, API, PostgreSQL, SQLite, outbox o contratos
  persistidos.
- Inferir tipo de control desde marcas o ingredientes.
- Incorporar dependencias o nuevas pantallas de catalogo.

## Requisitos

- RF-001: Ingrediente activo y Nombre comercial estan disponibles sin elegir
  antes un tipo de producto.
- RF-002: Elegir una marca completa su ingrediente, tipo, concentracion y unidad
  comercial usando la fila exacta del catalogo.
- RF-003: Elegir un ingrediente filtra sus marcas validas; una sola se completa
  automaticamente y varias requieren eleccion del usuario.
- RF-004: Un cambio de ingrediente o marca limpia o reemplaza datos
  incompatibles.
- RF-005: El tipo de producto derivado es visible y no editable.
- RF-006: Toda recomendacion con tipo de control vacio recibe Quimico por nombre
  normalizado; una seleccion existente nunca se sobrescribe.
- RF-007: Nombres comerciales repetidos se diferencian por ingrediente y tipo de
  producto.
- RNF-001: El flujo funciona offline con los catalogos SQLite ya disponibles.
- RNF-002: Borradores, recetas historicas y operaciones pendientes mantienen su
  formato y compatibilidad.

## Contratos afectados

Solo cambia la interaccion y las funciones puras internas del formulario
mobile. Los campos persistidos de receta, API, PostgreSQL, SQLite, outbox y
tipos compartidos no cambian.

## Seguridad y datos

No cambian permisos, datos personales ni comunicaciones remotas. Las relaciones
se resuelven en memoria sobre catalogos disponibles para la sesion. No se usan
IDs fijos para encontrar Quimico.

## Migracion y rollback

No requiere migracion. El avance es compatible con OTA. El rollback revierte el
codigo mobile y la documentacion; recetas y borradores permanecen legibles
porque conservan el contrato anterior.

## Criterios de aceptacion

- [x] CA-001: Una marca puede elegirse sin tipo previo y completa sus datos.
- [x] CA-002: Un ingrediente con una marca la autoselecciona y con varias deja
      la marca pendiente de eleccion.
- [x] CA-003: Marcas repetidas de tipos distintos resuelven la fila elegida.
- [x] CA-004: El tipo derivado se muestra como solo lectura.
- [x] CA-005: Quimico completa controles vacios y no reemplaza otro control.
- [x] CA-006: Fertilizantes y contratos persistidos no cambian.
- [x] CA-007: Una sola mezcla no muestra navegacion Anterior/Siguiente.

## Pruebas

- unitarias de opciones, seleccion marca-ingrediente y limpieza de dependencias;
- unitarias de marca unica, multiples marcas y nombres comerciales repetidos;
- unitarias del control Quimico por defecto y preservacion de controles;
- prueba de navegacion para una y varias mezclas;
- lint, typecheck, formato, validacion documental y revision independiente.

## Impacto documental

- [x] Arquitectura mobile.
- [x] Modelo de dominio.
- [x] Indices de specs y documentacion.
- [x] Runbook: no cambia.
- [x] ADR: no corresponde.
- [x] Variables o despliegue: no agrega variables; compatible con OTA.
