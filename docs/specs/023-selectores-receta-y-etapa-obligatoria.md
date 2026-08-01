---
title: Selectores dependientes de receta y etapa fenologica obligatoria
status: implemented
numero: "023"
area: receta, visitas, mobile, api, sync
created: 2026-08-01
approved_by: usuario, 2026-08-01
implemented_in: apps/mobile, apps/api y docs, 2026-08-01
---

# Spec 023: Selectores dependientes de receta y etapa fenologica obligatoria

## Contexto

La receta fitosanitaria muestra el ingrediente activo como un valor derivado del
nombre comercial. El flujo requerido parte del tipo de producto, continua con
el ingrediente activo y termina con los nombres comerciales compatibles.
Ademas, el registro de datos basicos permite guardar una visita sin etapa
fenologica aunque ese dato condiciona varios modulos agronomicos posteriores.

## Alcance

### Incluido

- Convertir ingrediente activo en un selector dependiente del tipo de producto.
- Filtrar nombre comercial por tipo de producto e ingrediente activo.
- Autoseleccionar cada selector dependiente cuando tenga una sola opcion.
- Colocar nombre comercial inmediatamente debajo de ingrediente activo.
- Exigir etapa fenologica en el alta mobile y en `POST /visitas-campo`.
- Impedir que `PATCH /visitas-campo/:id` elimine una etapa existente.

### Excluido

- Cambios de esquema PostgreSQL o SQLite.
- Guardar IDs de ingrediente activo o nombre comercial en la receta.
- Hacer obligatoria la etapa en filas historicas ya persistidas.
- Cambios en el panel web, permisos o catalogos.

## Requisitos

- RF-001: El selector de ingrediente activo solo muestra ingredientes asociados
  a nombres comerciales del tipo de producto seleccionado.
- RF-002: El selector de nombre comercial solo muestra opciones asociadas al
  tipo de producto e ingrediente activo seleccionados.
- RF-003: Si un conjunto dependiente contiene una sola opcion, esta se
  selecciona automaticamente y la cascada continua.
- RF-004: Cambiar un selector superior limpia valores inferiores incompatibles.
- RF-005: Seleccionar un nombre comercial completa su concentracion.
- RF-006: Las recetas siguen persistiendo nombres y concentracion como texto o
  numero, sin agregar IDs al payload ni a SQLite.
- RF-007: Mobile no guarda una visita nueva sin etapa fenologica y muestra el
  error junto al selector.
- RF-008: La API rechaza altas sin `phenologicalStageId`; las actualizaciones
  pueden omitir el campo, pero no enviarlo vacio o `null`.
- RNF-001: Las visitas y recetas historicas conservan compatibilidad de lectura.
- RNF-002: No se altera el orden, idempotencia ni recuperacion del outbox.

## Contratos afectados

- API: `CreateVisitaCampoDto.phenologicalStageId` pasa a ser obligatorio.
- API: `UpdateVisitaCampoDto.phenologicalStageId` es opcional por ausencia y no
  admite limpieza explicita.
- Mobile: todo nuevo `CreateVisitaCampoDraft` incluye `phenologicalStageId`.
- Receta, catalogos, PostgreSQL, SQLite y outbox mantienen sus contratos.

## Seguridad y datos

No se agregan permisos, secretos ni datos personales. La API conserva la
validacion de existencia, cultivo y tipo de la etapa. Los IDs de catalogo usados
por la UI no se persisten en receta.

## Migracion y rollback

No hay migracion de datos o esquema. Las filas historicas pueden seguir con etapa
nullable. Una visita local pendiente creada por una version anterior sin etapa
debe corregirse antes de sincronizar.

Rollback: revertir UI y DTO/servicio conjuntamente. Los datos persistidos y el
outbox no requieren transformacion.

## Criterios de aceptacion

- [x] CA-001: La receta muestra Tipo de producto, Ingrediente activo y Nombre
      comercial como cascada y en ese orden.
- [x] CA-002: Ingrediente y nombre comercial se filtran y autoseleccionan cuando
      queda una opcion.
- [x] CA-003: Cambiar tipo o ingrediente limpia selecciones incompatibles.
- [x] CA-004: Recetas historicas basadas en texto siguen mostrandose.
- [x] CA-005: Mobile bloquea el alta sin etapa y conserva la etapa en SQLite y
      el payload de sync.
- [x] CA-006: La API rechaza un alta sin etapa y un PATCH que intenta borrarla.
- [x] CA-007: Un PATCH que omite etapa y las filas historicas siguen siendo
      compatibles.

## Pruebas

- unitarias de la cascada de catalogos de receta;
- validacion y flujo local mobile de visitas;
- DTO, servicio y contrato HTTP de visitas en API;
- typecheck, lint, pruebas y validacion documental.

## Impacto documental

- [x] Arquitectura: documentar la etapa obligatoria para nuevas visitas.
- [x] Dominio/spec.
- [ ] Runbook: sin cambios.
- [ ] ADR: sin cambios.
- [ ] Variables o despliegue: sin cambios.
