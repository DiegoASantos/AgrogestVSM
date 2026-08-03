---
title: Alta offline de productores con asociacion completa en mobile
status: implemented
numero: 026
area: productores, sectores, subsectores, parcelas, mobile, api, sync, database
created: 2026-08-02
approved_by: usuario
implemented_in: apps/mobile/src/shared/database/schema.ts; apps/mobile/src/shared/database/migrations.ts; apps/mobile/src/shared/database/seed-catalogs.ts; apps/mobile/src/shared/sync/sync-entities.ts; apps/mobile/src/shared/sync/sync-handlers.ts; apps/mobile/src/shared/sync/sync-engine.ts; apps/mobile/src/modules/productores; apps/mobile/src/modules/sectores; apps/mobile/src/modules/subsectores; apps/mobile/src/modules/parcelas; apps/api/src/modules/sectores; apps/api/src/modules/subsectores; apps/api/src/modules/parcelas; docs/specs/026-alta-offline-productores-mobile.md
---

# Spec 026: Alta offline de productores con asociacion completa en mobile

## Contexto

Actualmente el mobile solo puede leer productores, sectores, subsectores y
parcelas desde el catalogo descargado de la API. No puede crear ninguna de estas
entidades. Ademas, la limpieza de catalogo (`seed-catalogs.ts`) elimina
productores sin parcelas y parcelas sin visitas, lo que impide conservar datos
creados localmente que aun no tengan asociaciones completas.

El negocio requiere que los agronomos puedan dar de alta un productor completo
desde el campo sin conexion, incluyendo la jerarquia territorial hasta la
parcela. El registro puede hacerse en partes y en dias distintos:

- un dia: crear el productor (persona, fundo o cooperativa) con sus datos
  basicos;
- otro dia (o el mismo): asociarle una parcela seleccionando o creando el
  distrito, sector y subsector correspondientes.

Ademas, la parcela creada debe quedar automaticamente asignada al agronomo que
la registro.

El flujo actual de catalogos y sync no contempla escritura offline para estas
entidades, por lo que se requiere extender el outbox, los handlers, los
repositorios y la UX.

## Alcance

### Incluido

- **Creacion de productor** (accion independiente):
  - Pantalla de creacion de productor en mobile con selector de tipo de entidad
    (`persona`, `fundo`, `cooperativa`) y campos condicionales segun Spec 005.
  - Guardado local inmediato con UUID y `sync_status = 'pending'`.
  - Al guardar, se pregunta si desea agregar una parcela ahora o despues.
- **Asociacion de parcela** (accion independiente sobre un productor existente):
  - Flujo paso a paso: seleccionar Distrito → seleccionar/crear Sector →
    seleccionar/crear Subsector → crear Parcela.
  - Accesible desde el selector de visita (productores sin parcela) o tras crear
    un productor nuevo.
  - Auto-seleccion en cada paso si solo existe una opcion disponible.
  - Captura opcional de punto de referencia GPS en la entrada del predio,
    almacenado como GeoJSON Point (`referencePoint`).
- **Productores sin parcela** en el selector de visita: aparecen deshabilitados
  (gris). Al tocarlos se muestra la opcion "Agregar parcela".
- **Asignacion automatica al agronomo**: al crear una parcela via API, si el
  usuario autenticado tiene rol `AGRONOMO` (sin `ADMIN`), el sistema auto-asigna
  `parcela.agronomoUsuarioId = currentUser.userId`.
- Guardado local inmediato de todas las entidades nuevas con UUID y
  `sync_status = 'pending'`.
- Agregar `sync_status` y columnas de reconciliacion a las tablas SQLite de
  `productores`, `sectores`, `subsectores` y `parcelas`.
- Agregar estas entidades a `SYNC_ENTITY_TABLES` y al `entityHandlerMap`.
- Sync handlers con orden de dependencias: productor → sector → subsector →
  parcela.
- Resolver IDs locales a server IDs en el handler de parcela antes del POST.
- Codigo de parcela temporal (UUID) en mobile, reemplazado por el codigo real
  (`PAR-XXX`) que devuelve la API.
- Endpoint `POST /productores` ya existe. Se agrega metodo `create` a
  `productoresRemote`.
- Endpoint `POST /sectores`: relajar guard de `@Roles("ADMIN")` a
  `@Roles("ADMIN", "AGRONOMO")`.
- Endpoint `POST /subsectores`: relajar guard de `@Roles("ADMIN")` a
  `@Roles("ADMIN", "AGRONOMO")`.
- Endpoint `POST /parcelas`: modificar `ParcelasService.create()` para recibir
  `CurrentUserContext` y auto-asignar `agronomoUsuarioId` si el usuario es
  agronomo. Se agrega metodo `create` a `parcelasRemote`.
- Eliminar la limpieza `DELETE FROM productores WHERE id NOT IN (SELECT
  DISTINCT productor_id FROM parcelas)` en `seed-catalogs.ts`.
- Eliminar la limpieza `DELETE FROM parcelas WHERE id NOT IN (SELECT DISTINCT
  parcela_id FROM visitas_campo)` en `seed-catalogs.ts` (o condicionarla para
  preservar parcelas con `sync_status = 'pending'`).
- Boton "Nuevo productor" en la pantalla `NewVisitaSelectorScreen`.
- Pruebas unitarias de repositorios, handlers y validaciones.
- Pruebas de integracion de sync multi-entidad con dependencias.

### Excluido

- Poligono geoespacial de parcela (`geometry`, MultiPolygon) desde mobile.
- Creacion de distritos, provincias o departamentos desde mobile.
- Edicion de productores, sectores, subsectores o parcelas existentes.
- Eliminacion (soft-delete) de estas entidades desde mobile.
- Campos no estandar o adicionales a los definidos en Spec 005, 006 y 007.
- Migraciones PostgreSQL nuevas (solo cambio de guards, sin DDL).
- Sincronizar creaciones masivas o por lote.

## Requisitos

### Pantalla de creacion de productor

- RF-001: Selector de tipo de entidad con opciones `persona`, `fundo` y
  `cooperativa`. Por defecto `persona`.
- RF-002: Para `persona`: campos `firstName`, `lastName`, `documentTypeId`,
  `documentNumber`, `phone`, `email`, `address`. `firstName` y `lastName`
  obligatorios. Documento opcional pero ambos campos deben informarse juntos si
  se usan.
- RF-003: Para `fundo` y `cooperativa`: solo `firstName` obligatorio (como
  nombre de la entidad). Sin campos de documento ni `lastName`.
- RF-004: Validacion local identica a las reglas de `validateProducerInput` de
  la API (Spec 005).
- RF-005: Al guardar, insertar en SQLite `productores` con `id` UUID v4,
  `public_id` UUID v4, `sync_status = 'pending'`, `server_id = NULL`,
  timestamps locales ISO.

### Asociacion de parcela a un productor existente

- RF-006: La accion "Agregar parcela" se inicia desde dos puntos:
  - Dialogo post-creacion de productor ("Desea agregar una parcela ahora?");
  - Toque en un productor deshabilitado del selector de visita.
- RF-007: Paso 1 - Selector de Distrito. Carga los distritos desde la tabla
  local `distritos` (ya precargados por catalogo). Si solo hay un distrito, se
  auto-selecciona.
- RF-008: Paso 2 - Selector de Sector. Muestra sectores existentes filtrados
  por el distrito seleccionado. Incluye opcion "Crear nuevo sector" que
  despliega un campo de texto para el nombre. Si solo hay un sector y no se
  elige crear, auto-selecciona.
- RF-009: Paso 3 - Selector de Subsector. Muestra subsectores existentes
  filtrados por el sector seleccionado. Incluye opcion "Crear nuevo subsector".
  Si solo hay un subsector, auto-selecciona.
- RF-010: Paso 4 - Formulario de Parcela. Campos: nombre (opcional), area en
  hectareas (opcional), descripcion (opcional), punto de referencia GPS
  (opcional, ver RF-036 a RF-039). El `productorId` y `subsectorId`
  se asignan automaticamente.
- RF-011: Si se crea un nuevo sector, se inserta en `sectores` con UUID,
  `sync_status = 'pending'`, `distrito_id` del paso 1.
- RF-012: Si se crea un nuevo subsector, se inserta en `subsectores` con UUID,
  `sync_status = 'pending'`, `sector_id` del paso 2.
- RF-013: La parcela se inserta en `parcelas` con UUID, `code` = UUID temporal,
  `sync_status = 'pending'`, `productor_id` y `subsector_id` con los IDs
  locales correspondientes, y `reference_point` como JSON string del GeoJSON
  Point (o NULL si no se capturo).

### Productores sin parcela en el selector de visita

- RF-014: Los productores que no tienen ninguna parcela asociada aparecen en la
  lista del selector de visita pero en estado deshabilitado (visualmente
  atenuados, no seleccionables para iniciar una visita).
- RF-015: Al tocar un productor deshabilitado, se muestra un dialogo o accion
  "Agregar parcela" que inicia el flujo de asociacion territorial (RF-007 a
  RF-013).
- RF-016: Al completar el flujo "Agregar parcela", el productor queda habilitado
  con su nueva parcela preseleccionada en el selector de visita.
- RF-017: Los productores con al menos una parcela funcionan como hasta ahora:
  son seleccionables e inician la cascada sector → subsector → parcela existente.

### Punto de referencia GPS en parcela

- RF-036: El formulario de creacion de parcela incluye un boton "Capturar
  ubicacion (entrada del predio)". Es opcional: el usuario puede omitirlo y
  guardar la parcela sin punto de referencia.
- RF-037: Al presionar el boton, se solicita permiso de ubicacion al
  dispositivo. Si se concede, se obtienen las coordenadas GPS actuales (latitud,
  longitud) y se muestra el valor capturado en pantalla. Si se deniega, se
  muestra un mensaje indicando que no se pudo acceder a la ubicacion.
- RF-038: El boton muestra una instruccion visible para el usuario:
  "Capture el punto GPS en la entrada del predio". Este texto debe estar
  presente junto al boton o como placeholder.
- RF-039: Si el usuario guarda la parcela sin haber capturado el punto de
  referencia, se muestra una advertencia: "La parcela no tiene punto de
  referencia. Se recomienda capturarlo en la entrada del predio." El usuario
  puede confirmar y guardar de todos modos, o volver para capturarlo.
- RF-040: El `referencePoint` capturado se almacena en SQLite como string JSON
  con formato GeoJSON Point: `{"type":"Point","coordinates":[longitud,latitud]}`.
  Si no se capturo, se guarda como NULL. El sync handler lo envia en el mismo
  formato al endpoint `POST /parcelas`.

### Sincronizacion offline

- RF-018: El outbox debe ordenar las entidades por dependencia jerarquica:
  `productores` y `sectores` primero (nivel 0), luego `subsectores` (nivel 1),
  luego `parcelas` (nivel 2), luego `visitas_campo` (nivel 3), luego el resto.

- RF-019: Handler `handleProductor`:
  - Lee el registro local de `productores`.
  - Si `operation = 'create'`, llama a `POST /productores` con el payload.
  - Al recibir respuesta, actualiza `server_id` con el ID del servidor y
    `sync_status = 'synced'`.
  - Si `operation = 'delete'`, llama a `DELETE /productores/:serverId`.

- RF-020: Handler `handleSector`:
  - Lee el registro local de `sectores`.
  - Para `create`, llama a `POST /sectores` con `name` y `distritoId`.
  - Actualiza `server_id` y `sync_status` al recibir respuesta.

- RF-021: Handler `handleSubsector`:
  - Lee el registro local de `subsectores`.
  - Para `create`, necesita resolver `sector_id` local al `serverId` del sector
    (si el sector fue creado localmente y ya sincronizado).
  - Llama a `POST /subsectores` con `name` y `sectorId` (server ID).
  - Si el sector padre aun no tiene `server_id`, hace skip (dependencia no
    resuelta) para reintentar en el siguiente ciclo.

- RF-022: Handler `handleParcela`:
  - Lee el registro local de `parcelas`.
  - Resuelve `productor_id` local → `serverId` del productor.
  - Resuelve `subsector_id` local → `serverId` del subsector.
  - Si alguno de los padres no tiene `server_id`, hace skip.
  - Llama a `POST /parcelas` con `productorId`, `subsectorId`, `name`,
    `areaHectares`, `description`, `referencePoint` (IDs de servidor ya
    resueltos).
  - Al recibir respuesta, actualiza `server_id`, `code` (con el `PAR-XXX`
    real), `public_id` y `sync_status = 'synced'`.

- RF-023: Los handlers de `delete` para estas entidades deben verificar que
  exista `server_id` antes de llamar al endpoint de borrado. Si no existe, es
  un `deleted_local` directo.

- RF-024: La reconciliacion (`reconcilePendingOutboxEntries`) debe incluir las
  nuevas tablas en su escaneo de entidades con `sync_status = 'pending'` sin
  entrada en outbox.

### Cambios en API

- RF-025: Cambiar `@Roles("ADMIN")` por `@Roles("ADMIN", "AGRONOMO")` en:
  - `POST /sectores` (`sectores.controller.ts:36`)
  - `POST /subsectores` (`subsectores.controller.ts:36`)

- RF-026: Modificar `POST /parcelas` (`ParcelasService.create()`) para recibir
  `CurrentUserContext` y auto-asignar `agronomoUsuarioId` si el usuario
  autenticado tiene rol `AGRONOMO` (sin `ADMIN`). Si el usuario es `ADMIN`, no
  se auto-asigna (el admin puede asignar manualmente despues via
  `PATCH /parcelas/:id/agronomo`).

- RF-027: Asegurar que `POST /parcelas` retorna `code` en la respuesta (ya lo
  hace; verificar Swagger).

- RF-028: Verificar que `POST /productores` acepta `entityType` y aplica las
  validaciones de Spec 005 (ya implementado; verificar).

### Cambios en catalogo mobile

- RF-029: Eliminar la sentencia `DELETE FROM productores WHERE id NOT IN
  (SELECT DISTINCT productor_id FROM parcelas)` en `seed-catalogs.ts:365-367`.
  Los productores creados localmente deben conservarse aunque no tengan parcelas
  aun.

- RF-030: Modificar la sentencia `DELETE FROM parcelas WHERE id NOT IN (SELECT
  DISTINCT parcela_id FROM visitas_campo)` en `seed-catalogs.ts:472-474` para
  excluir parcelas con `sync_status = 'pending'`:
  ```sql
  DELETE FROM parcelas
  WHERE id NOT IN (SELECT DISTINCT parcela_id FROM visitas_campo)
    AND (sync_status IS NULL OR sync_status = 'synced')
  ```

### UX y navegacion

- RF-031: Boton "Nuevo productor" visible en `NewVisitaSelectorScreen`, debajo
  o junto al selector de productor existente.

- RF-032: Tras guardar un productor nuevo, mostrar dialogo "Desea agregar una
  parcela ahora?" con opciones "Si" (inicia flujo de asociacion) y "Ahora no"
  (vuelve al selector de visita, productor queda deshabilitado).

- RF-033: Al completar el flujo "Agregar parcela" (desde cualquier punto de
  entrada), navegar de vuelta al `NewVisitaSelectorScreen` con:
  - el productor preseleccionado;
  - la cascada sector → subsector → parcela resuelta automaticamente (solo hay
    una parcela para este productor nuevo);
  - la parcela seleccionada.

- RF-034: Si el usuario cancela el flujo de asociacion a mitad de camino, los
  datos ya guardados (ej. sector creado, subsector creado) persisten en SQLite
  con `sync_status = 'pending'`. El productor queda deshabilitado en el selector
  hasta que se complete la asociacion.

- RF-035: Al tocar "Nuevo productor" cuando ya existen productores pendientes
  sin parcela, ofrecer la opcion de crear uno nuevo o continuar con uno
  pendiente.

### Requisitos no funcionales

- RNF-001: La creacion debe funcionar 100% offline. Ningun paso debe requerir
  conectividad.
- RNF-002: El orden de sincronizacion debe respetar estrictamente las
  dependencias (productor/sector → subsector → parcela).
- RNF-003: Si una entidad padre falla, las dependientes no deben intentar
  sincronizarse (el handler hace skip).
- RNF-004: Los datos no deben perderse si la app se cierra o pasa a background
  durante el flujo de creacion.
- RNF-005: La descarga de catalogos no debe sobrescribir entidades con
  `sync_status = 'pending'`. Usar `INSERT OR IGNORE` para las tablas afectadas
  cuando el registro local es mas reciente o esta pendiente.
- RNF-006: La captura GPS es opcional. Si el dispositivo no tiene GPS o el
  usuario deniega el permiso, la parcela se crea igual sin punto de referencia.
- RNF-007: No se deben introducir secretos ni logs con datos personales.

## Contratos afectados

### SQLite mobile

- Tabla `productores`: agregar columnas `server_id TEXT`, `sync_status TEXT NOT
  NULL DEFAULT 'synced'`, `sync_error_message TEXT`.
- Tabla `sectores`: agregar columnas `server_id TEXT`, `sync_status TEXT NOT
  NULL DEFAULT 'synced'`, `sync_error_message TEXT`.
- Tabla `subsectores`: agregar columnas `server_id TEXT`, `sync_status TEXT NOT
  NULL DEFAULT 'synced'`, `sync_error_message TEXT`.
- Tabla `parcelas`: agregar columnas `server_id TEXT`, `sync_status TEXT NOT
  NULL DEFAULT 'synced'`, `sync_error_message TEXT`.
- Tabla `sync_outbox`: sin cambios estructurales.
- Valores existentes (descargados de catalogo) mantienen `sync_status =
  'synced'` y `server_id = id` (el ID del servidor ya es el ID local para
  entidades de catalogo).

### API NestJS

- `POST /sectores`: cambio de `@Roles("ADMIN")` a `@Roles("ADMIN", "AGRONOMO")`.
- `POST /subsectores`: idem.
- `POST /parcelas`: modificar `ParcelasService.create()` para recibir
  `CurrentUserContext` y auto-asignar `agronomoUsuarioId` cuando el usuario
  autenticado tenga rol `AGRONOMO` (sin `ADMIN`).

### Sync

- `SYNC_ENTITY_TABLES`: agregar `productores`, `sectores`, `subsectores`,
  `parcelas`.
- `entityHandlerMap`: agregar 4 nuevos handlers.
- `sync-engine.ts`: modificar orden de procesamiento del outbox para respetar
  jerarquia de dependencias.

### Tipos y contratos compartidos

- Sin cambios en `packages/contracts`. Los tipos existentes (`Productor`,
  `Sector`, `Subsector`, `Parcela`) ya reflejan el contrato.

## Seguridad y datos

- Relajar guards de `POST /sectores` y `POST /subsectores` de `ADMIN` exclusivo
  a `ADMIN` + `AGRONOMO`. El rol `ANALISTA` sigue bloqueado por el guard (solo
  lectura en todos los metodos no GET).
- Los datos de productores incluyen datos personales (documento, telefono,
  email, direccion). El sync transmite estos datos sobre HTTPS igual que el
  resto de la API. No se agregan logs con datos personales.
- La autorizacion del frontend no sustituye los guards de la API. El cambio de
  roles y la auto-asignacion de agronomo son las unicas modificaciones de
  seguridad.
- La auto-asignacion `agronomoUsuarioId` solo aplica para usuarios con rol
  `AGRONOMO` sin `ADMIN`. Un admin puede crear parcelas sin asignacion
  automatica y usar el endpoint `PATCH /parcelas/:id/agronomo` para asignar.
- Las parcelas no incluiran el poligono geoespacial (`geometry`) desde mobile.
  Solo se captura el punto de referencia (`referencePoint`) como coordenada
  unica en la entrada del predio.
- La captura GPS requiere permiso de ubicacion del dispositivo. El usuario debe
  concederlo explicitamente. Si lo deniega, la funcionalidad se degrada
  correctamente sin bloquear la creacion de la parcela.

## Migracion y rollback

### SQLite mobile

Agregar migracion en `migrations.ts`:

```sql
ALTER TABLE productores ADD COLUMN server_id TEXT;
ALTER TABLE productores ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE productores ADD COLUMN sync_error_message TEXT;

ALTER TABLE sectores ADD COLUMN server_id TEXT;
ALTER TABLE sectores ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE sectores ADD COLUMN sync_error_message TEXT;

ALTER TABLE subsectores ADD COLUMN server_id TEXT;
ALTER TABLE subsectores ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE subsectores ADD COLUMN sync_error_message TEXT;

ALTER TABLE parcelas ADD COLUMN server_id TEXT;
ALTER TABLE parcelas ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE parcelas ADD COLUMN sync_error_message TEXT;
```

- Usar `ALTER TABLE ... ADD COLUMN` con helper idempotente (verificar si la
  columna ya existe).
- Valores por defecto `'synced'` para registros existentes descargados de
  catalogo.
- Rollback: no se requiere revertir columnas agregadas; no afectan el
  funcionamiento anterior.

### API PostgreSQL

- Sin migraciones de esquema.
- Rollback del cambio de guards: restaurar `@Roles("ADMIN")`.

### Catalogo mobile

- Rollback de cambios en limpieza: restaurar las sentencias `DELETE FROM`
  originales.

### Compatibilidad

- Mobile con la nueva migracion puede operar sin conexion; los catalogos
  existentes se preservan con `sync_status = 'synced'`.
- Si la API no tiene aun los guards relajados, las creaciones de sector y
  subsector fallaran en sync con error permanente (no criticas para productor +
  parcela usando entidades existentes).

## Orden de implementacion

1. Migracion SQLite (columnas `server_id`, `sync_status`, `sync_error_message`
   en las 4 tablas).
2. Repositorios mobile: agregar metodos `insert`, `update`, `getByLocalId` a
   `productores`, `sectores`, `subsectores` y `parcelas`.
3. Servicios remote: agregar metodos `create` a `productoresRemote`,
   `sectoresRemote`, `subsectoresRemote`, `parcelasRemote`.
4. `SYNC_ENTITY_TABLES` + `entityHandlerMap` + handlers de sync para las 4
   entidades.
5. Orden de outbox en `sync-engine.ts`.
6. Reconciliacion de outbox para nuevas tablas.
7. API: relajar guards en `sectores.controller.ts` y
   `subsectores.controller.ts`.
8. API: modificar `ParcelasService.create()` para recibir `CurrentUserContext` y
   auto-asignar agronomo.
9. Pantalla de creacion de productor (`NuevoProductorScreen`).
10. Pantalla/flujo de asociacion territorial (`AgregarParcelaScreen` o wizard de
    pasos), incluyendo boton de captura GPS y logica de permisos de ubicacion.
11. Boton "Nuevo productor" en `NewVisitaSelectorScreen` + productores
    deshabilitados + redireccion post-creacion.
12. Cambios en `seed-catalogs.ts` (eliminar/condicionar limpieza agresiva).
13. Pruebas unitarias de repositorios, validaciones y handlers.
14. Pruebas de integracion de sync multi-entidad.
15. Validaciones finales: `pnpm lint`, `pnpm typecheck`, `pnpm test`.

## Criterios de aceptacion

- [ ] CA-001: Se puede crear un productor tipo `persona` con nombre, apellido y
  documento desde el mobile sin conexion. El registro aparece en SQLite con
  `sync_status = 'pending'`.
- [ ] CA-002: Se puede crear un productor tipo `fundo` sin documento ni
  apellido desde el mobile.
- [ ] CA-003: Tras guardar un productor nuevo, se muestra el dialogo "Desea
  agregar una parcela ahora?". Si elige "Ahora no", vuelve al selector donde el
  productor aparece deshabilitado.
- [ ] CA-004: Un productor sin parcela aparece deshabilitado en el selector de
  visita. Al tocarlo se muestra la opcion "Agregar parcela".
- [ ] CA-005: El flujo "Agregar parcela" permite seleccionar distrito → sector
  → subsector → crear parcela. Se puede crear un nuevo sector y subsector
  durante el flujo.
- [ ] CA-006: Al completar "Agregar parcela", el usuario vuelve al selector de
  visita con el productor habilitado y la nueva parcela seleccionada.
- [ ] CA-007: Al sincronizar con conexion, el productor se crea en la API y su
  `server_id` y `sync_status` se actualizan en SQLite.
- [ ] CA-008: Si el sector o subsector padre aun no tiene `server_id`, la
  parcela NO se intenta sincronizar (skip).
- [ ] CA-009: El codigo de parcela temporal (UUID) se reemplaza por el codigo
  real `PAR-XXX` al sincronizar.
- [ ] CA-010: Las limpiezas de catalogo ya no eliminan productores sin parcelas
  ni parcelas sin visitas con `sync_status = 'pending'`.
- [ ] CA-011: Un agronomo puede crear sectores y subsectores via API (POST
  /sectores, POST /subsectores).
- [ ] CA-012: Una parcela creada por un agronomo queda automaticamente asignada
  a ese agronomo (`agronomoUsuarioId` poblado en la respuesta de
  `POST /parcelas`).
- [ ] CA-013: Una parcela creada por un admin NO tiene `agronomoUsuarioId`
  auto-asignado.
- [ ] CA-014: El boton "Nuevo productor" es visible en la pantalla de seleccion
  de productor para nueva visita.
- [ ] CA-015: Si el usuario cancela el flujo a mitad de camino, los datos ya
  guardados persisten y se sincronizan posteriormente.
- [ ] CA-016: El formulario de parcela muestra el boton "Capturar ubicacion
  (entrada del predio)" con la instruccion de capturar en la entrada del predio.
- [ ] CA-017: Si el usuario guarda la parcela sin punto de referencia, se
  muestra la advertencia y puede confirmar el guardado sin el punto.
- [ ] CA-018: El `referencePoint` capturado se sincroniza correctamente como
  GeoJSON Point y queda almacenado en PostgreSQL al crear la parcela.

## Pruebas

- Mobile unitarias:
  - repositorios: insert, update, getByLocalId para las 4 entidades;
  - validaciones de formulario de productor (tipos de entidad, campos
    obligatorios);
  - handlers de sync: create exitoso, skip por dependencia no resuelta, delete.
- Mobile integracion:
  - sync multi-entidad: crear productor + sector + subsector + parcela
    localmente, verificar que tras sync en orden correcto todos quedan
    `synced`;
  - sync parcial: si el productor falla, sector/subsector/parcela no se
    intentan;
  - sync de referencePoint: verificar que el GeoJSON Point se envia y persiste
    correctamente en la API.
- Mobile migracion:
  - test de migracion SQLite para columnas `server_id`, `sync_status`. Verificar
    que registros existentes quedan con `sync_status = 'synced'`.
- API:
  - test de guards: verificar que `AGRONOMO` puede crear sector y subsector;
  - verificar que `ANALISTA` sigue bloqueado para POST;
  - test de auto-asignacion: parcela creada por `AGRONOMO` tiene
    `agronomoUsuarioId` poblado;
  - test de no-asignacion: parcela creada por `ADMIN` no tiene
    `agronomoUsuarioId` auto-asignado.
- Administracion:
  - `pnpm lint` en las tres apps;
  - `pnpm typecheck` en las tres apps;
  - `pnpm test` en las apps afectadas.

## Impacto documental

- [ ] Arquitectura: actualizar `docs/architecture/overview.md` si el sync de
  entidades de catalogo cambia el flujo general.
- [ ] Dominio: actualizar `docs/domain/data-model.md` para reflejar que el
  mobile ahora puede escribir productores, sectores, subsectores y parcelas.
- [ ] Glosario: verificar que `docs/domain/glossary.md` refleja los cambios de
  Spec 005, 006 y 007 pendientes (subsector, tipos de entidad).
- [ ] Runbook: agregar runbook de recuperacion si el sync de estas entidades
  falla en cascada.
- [ ] ADR: no se requiere ADR nuevo.
- [ ] Variables o despliegue: no aplica.
- [ ] Specs: al implementar, cambiar estado a `implemented`, completar
  `implemented_in` y actualizar `docs/specs/README.md`.
