---
title: Relacion de marcas mobile con ingrediente activo
status: implemented
numero: 038
area: mobile, recetas, catalogos, sqlite, sync
created: 2026-08-15
approved_by: usuario, 2026-08-15
implemented_in: apps/mobile/src/modules/visita-recetas; apps/mobile/src/shared/sync; apps/mobile/src/shared/database/sync-outbox.ts; 2026-08-15
---

# Spec 038: Relacion de marcas mobile con ingrediente activo

## Contexto

El formulario mobile de nuevo producto conserva un estado para el ingrediente
activo de una marca comercial, pero no muestra un selector, no exige la
seleccion y guarda la relacion vacia. Ademas, el handler de sincronizacion envia
el identificador local de SQLite directamente a la API, aunque esta espera el
identificador numerico remoto.

El tecnico necesita consultar todo el catalogo de ingredientes activos, buscar
por nombre y asociar obligatoriamente la nueva marca, incluso cuando trabaja
sin conexion.

## Alcance

### Incluido

- Selector buscable con todos los ingredientes activos del catalogo local.
- Ingrediente activo obligatorio al crear una marca desde mobile.
- Preseleccion editable al navegar desde un producto de receta que ya tiene
  ingrediente activo.
- Persistencia local del ID y nombre del ingrediente seleccionado.
- Resolucion del ID local al `server_id` antes de sincronizar la marca.
- Orden de outbox que procesa ingredientes antes que marcas.
- Pruebas de validacion, dependencia y payload remoto.

### Excluido

- Cambios en PostgreSQL, SQLite o migraciones.
- Cambios en el contrato de la API.
- Reparacion automatica de marcas historicas sin ingrediente activo.
- Hacer obligatoria la relacion en otros clientes.

## Requisitos

- RF-001: Al crear una marca, mobile debe mostrar todos los ingredientes
  activos locales ordenados por nombre.
- RF-002: El selector debe filtrar por nombre sin distinguir mayusculas ni
  tildes.
- RF-003: Mobile no debe guardar una marca sin un ingrediente activo valido.
- RF-004: La marca local debe conservar el ID local y el nombre del ingrediente.
- RF-005: El handler debe enviar el `server_id` del ingrediente a la API.
- RF-006: Si el ingrediente aun no tiene `server_id`, la marca debe permanecer
  pendiente sin ejecutar su request.
- RNF-001: La operacion debe conservar idempotencia, recuperacion tras reinicio
  y datos pendientes ante fallos de red.

## Contratos afectados

- Navegacion mobile: `/productos/nuevo` acepta el parametro opcional
  `ingredienteActivoId` para preseleccion.
- SQLite: se reutilizan `ingrediente_activo_id` e
  `ingrediente_activo_nombre`; no cambia el esquema.
- API: se conserva el payload actual y `ingredienteActivoId` sigue siendo el ID
  numerico remoto esperado.

## Seguridad y datos

- No se agregan permisos, secretos ni datos personales.
- Las opciones proceden exclusivamente del catalogo SQLite local.
- Un ID local nunca se envia como relacion remota.

## Migracion y rollback

- Avance: distribuir el cambio JavaScript mediante Expo/EAS Update compatible.
- Compatibilidad: las marcas historicas sin relacion no se modifican; el nuevo
  requisito aplica solo a altas mobile posteriores.
- Rollback: revertir UI, orden de outbox y resolucion del handler. No existe
  rollback SQL.

## Criterios de aceptacion

- [x] CA-001: El selector muestra todo el catalogo y permite buscar por nombre.
- [x] CA-002: No se puede guardar una marca sin ingrediente activo.
- [x] CA-003: Desde receta, el ingrediente actual aparece preseleccionado y
      sigue siendo editable.
- [x] CA-004: SQLite guarda ID local y nombre del ingrediente.
- [x] CA-005: Sync envia el ID remoto y confirma la marca solo tras respuesta
      valida de API.
- [x] CA-006: Una marca espera si su ingrediente esta pendiente y puede
      sincronizarse en un ciclo posterior sin perdida de datos.

## Pruebas

- Unitarias del formulario: obligatoriedad y resolucion de la seleccion.
- Unitarias de handlers: ingrediente sincronizado y dependencia pendiente.
- Outbox: prioridad de ingrediente anterior a marca.
- Regresion de selectores de receta y suite focalizada de sync.
- Lint, typecheck y formato del alcance mobile.

## Impacto documental

- [x] Arquitectura: actualizado el flujo de catalogos de receta escribibles.
- [x] Dominio: no cambia el modelo conceptual existente.
- [x] Runbook: no cambia el procedimiento de despliegue.
- [x] ADR: no se requiere.
- [x] Variables o despliegue: no se agregan variables ni build nativo.

## Evidencia de implementacion

- Formulario: selector buscable sobre `getIngredientesActivos()`, validacion
  obligatoria y persistencia de ID y nombre local.
- Navegacion: la receta transmite el ingrediente actual como preseleccion
  editable al alta de marca.
- Sync: el handler resuelve `server_id`, omite dependencias pendientes y la
  consulta de outbox prioriza ingredientes antes que marcas.
- Pruebas focalizadas: 25/25 correctas.
- Suite `apps/mobile/src/shared/sync`: 57/57 correctas.
- Typecheck mobile, ESLint del alcance y `git diff --check`: correctos.
