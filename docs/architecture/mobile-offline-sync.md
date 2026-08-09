---
title: Sincronización mobile offline
status: active
owner: mantenimiento
last_reviewed: 2026-08-09
related_code:
  - apps/mobile/src/shared/database
  - apps/mobile/src/shared/sync
  - apps/mobile/src/shared/services/api
  - apps/mobile/src/modules/auth
  - apps/mobile/src/modules/parcelas
  - apps/mobile/src/modules/visita-recetas
---

# Sincronización mobile offline

## Objetivo

Permitir que el técnico registre una visita completa sin conexión y la envíe a
la API cuando vuelva a tener conectividad.

## Flujo

1. Las pantallas escriben primero en SQLite.
2. El repositorio local agrega una operación a `sync_outbox`.
3. El motor verifica conexión y sesión.
4. La visita padre se sincroniza antes que sus entidades hijas.
5. El ID del servidor se guarda junto al ID local.
6. Se sincronizan evaluaciones, sanidad, notas, riego, labores y receta.
7. Los registros pasan a `synced`, quedan `pending` o terminan en `error`.

### Parcelas con dos puntos de referencia

El alta mobile de una parcela guarda en la misma transacción SQLite el punto de
acceso al predio (`reference_point`) y la ubicación interna de la parcela
(`parcel_reference_point`). Ambos son GeoJSON Point opcionales y pueden tener
las mismas coordenadas. La creación conserva una sola entrada `parcelas` en la
outbox; su handler resuelve primero los IDs remotos de productor y subsector y
envía ambos puntos dentro del mismo payload idempotente.

La migración SQLite 57 es aditiva y deja el punto interno en `NULL` para
parcelas existentes. El UPSERT del catálogo descarga los dos valores, pero no
sustituye una parcela local con `sync_status = 'pending'`.

### Recetas con mezclas

La receta es la unica unidad de outbox de su agregado. Sus mezclas,
fitosanitarios, fertilizaciones, riego y labores usan handlers `skipSync` y
viajan anidados en el payload de `visita_recetas`. La tabla
`visita_receta_mezcla` conserva un `local_id` estable por tanque; cada producto
referencia `mezcla_local_id`. El guardado local reemplaza el agregado completo
dentro de una transaccion SQLite para no dejar una receta parcialmente escrita.

El handler envia `mezclas[]` con `productos[]`. Tras la confirmacion de API,
`markSynced` guarda el ID remoto de cada mezcla, usando su numero dentro de la
receta, y confirma en conjunto todos los detalles. Un reintento conserva una
sola operacion padre: no crea outbox independientes para las mezclas ni para
sus productos.

## Disparadores

- nueva entrada de outbox;
- recuperación de conectividad;
- aplicación activa;
- solicitud manual;
- ciclo periodico aproximado de treinta segundos cuando hay trabajo local o
  verificacion ligera.

## Calidad de red adaptativa

El sync no asume que "hay conexion" equivale a "la red sirve para sincronizar".
NetInfo solo decide desconexion absoluta. Cuando hay conexion, `SyncManager`
mantiene en SQLite una ventana reciente de intentos en `sync_state` y calcula la
tasa de exito por operaciones individuales (no por ciclo completo):

- tasa de exito mayor o igual a 70%: red estable, sync normal;
- tasa menor a 70%: red inestable, sync automatico con backoff progresivo
  (10s, 30s, 60s, 120s);
- tasa menor a 20%: intervalo minimo de 60 segundos entre reintentos
  automaticos;
- tres exitos consecutivos restauran el estado estable;
- el boton manual omite el backoff (`bypassBackoff`) sin forzar refresh de
  autenticacion.

Los guardados siguen escribiendo primero en SQLite y programan sync en segundo
plano. La UI no espera a la red para confirmar el guardado local.

## Timeouts HTTP

Todo request HTTP emitido por el cliente movil tiene un timeout explicito
cancelable via `AbortController`:

- default: 15 segundos para requests JSON normales y de sync;
- sesion/auth: 5 segundos para refresh de token;
- catalogos: heredan el default de 15s, pueden declarar uno mayor;
- las respuestas se leen hasta terminar el body, manteniendo el timeout activo.

Un timeout genera `ApiTimeoutError` (HTTP 408) clasificado como error
transitorio por el motor de sync. El `AbortSignal` se propaga a cada handler
del outbox para que el request activo se cancele al agotar el presupuesto del
ciclo.

## Presupuesto de ciclo

Cada ejecucion de sync tiene un deadline:

- manual (`Sincronizar ahora`): 30 segundos;
- automatico: 45 segundos.

Al agotarse, se aborta el request activo, se preservan las entradas no
procesadas y `isSyncing` vuelve a `false`. La UI nunca queda en
"Sincronizando..." tras el deadline.

## Sesion online

La sesion distingue tres estados:

- `online_valid`: token vigente, sync habilitado;
- `online_temporarily_unavailable`: fallo transitorio de refresh, cooldown de
  60s; token vigente usable sin HTTP; acceso offline conservado;
- `online_reauth_required`: refresh rechazado con 401/403; tokens online
  limpiados; acceso offline conservado mientras su TTL sea valido.

El login fresco resetea el backoff de red, limpia el estado de reautenticacion
y programa un sync inmediato con `bypassBackoff`.

## Reintentos y fallos durables

- los errores transitorios se reintentan hasta 5 veces;
- al agotar o recibir error permanente, la operacion se mueve de `sync_outbox`
  a `sync_failures` en una transaccion atomica, preservando tipo, payload y
  operacion (incluidos deletes);
- errores de autenticacion nunca van a `sync_failures`; detienen el ciclo
  conservando el outbox;
- `Sincronizar ahora` procesa solo `sync_outbox`; `Reintentar fallidos` es una
  accion separada que reencola solo fallos `transient` en orden padre-hijos;
- errores `permanent` permanecen visibles y requieren correccion explicita
  desde el detalle del dato;
- un error de autenticacion detiene el ciclo;
- ciertos conflictos recuperan el ID existente del servidor.

## Invariantes

- toda visita nueva se guarda con etapa fenológica; una visita pendiente de una
  versión anterior sin etapa debe corregirse antes de reintentar su sync;
- no sincronizar hijos antes de obtener el ID de la visita;
- conservar operaciones de borrado con el ID remoto necesario;
- evitar duplicar entradas equivalentes en la outbox;
- no perder datos locales por una caida de red;
- mantener idempotencia mediante IDs publicos cuando aplique;
- no considerar `synced` una entidad que no fue confirmada por la API;
- al finalizar el paso 3 de Enfermedades, su nota de paso espera en outbox si
  existe una observación de enfermedad `pending` o `error`; primero se confirma
  la captura y luego se publica la finalización que habilita el macro-score;
- al finalizar el paso 4 de Nutrición, su nota de paso espera en outbox si existe
  una evaluación nutricional `pending` o `error`; cada evaluación conserva el
  `nutrientId` del catálogo y se confirma antes de publicar la finalización que
  habilita el macro-score. La barrera incluye borrados nutricionales pendientes
  o preservados en `sync_failures`, cuyo payload conserva visita e identidad;
- la recarga del catálogo nutricional usa UPSERT sin borrado implícito. Si una
  identidad `(cultivo, code)` cambia de ID remoto, SQLite remapea evaluaciones y
  detalles dentro de la misma transacción antes de retirar el ID anterior;
- ningun fallo de red, timeout, cancelacion o auth borra datos locales;
- el estado de backoff nunca impide un sync manual con token valido;
- los catalogos se refrescan de forma independiente al push del outbox;
- las operaciones agotadas se preservan en `sync_failures` hasta reintento
  explicito o correccion del dato.

El diagnóstico mostrado en Inicio inspecciona las columnas disponibles antes de
construir el detalle de errores. Las entidades operativas conservan y ordenan
por `updated_at`; las cachés de catálogo que no tienen ese timestamp exponen
fecha nula y se ordenan por identificador. Esta diferencia de esquema no debe
impedir el arranque ni requiere agregar columnas artificiales a los catálogos.

## Cachés de consulta

Los datos derivados y de solo lectura no se convierten en entidades
sincronizables. Por ejemplo, `clima_parcela_cache` conserva la última respuesta
de clima por parcela para que Inicio pueda mostrarla sin conexión; no crea
entradas en `sync_outbox`, no modifica datos de campo y señala al usuario cuando
la estimación está vencida. La API es la única que resuelve la ubicación de la
parcela y consulta al proveedor externo.

El clima general de Inicio usa `clima_distrito_cache`: una caché local de solo
lectura por distrito, sin outbox ni cambios de datos operativos. La API resuelve
el punto climático territorial; este flujo no usa geometría de parcelas.

Los catálogos de receta `marcas_producto` y `fertilizantes` conservan localmente
la concentración comercial textual y su unidad de medida. Son caché de solo
lectura y no generan outbox. La migración aditiva 49 agrega las columnas
necesarias y la correctiva 50 vuelve a invalidar `catalogs_downloaded_at` para
forzar la descarga posterior a la reparación del backend. Cuando esa descarga
termina, una receta abierta relee SQLite y completa concentración y unidad de la
selección existente, sin borrar recetas, catálogos ni operaciones pendientes.

El detalle de visita deriva directamente desde SQLite los scores técnicos de
Plagas, Enfermedades, Nutrición y Riego. Esta previsualización no se persiste ni
crea outbox: usa las mismas reglas de elegibilidad, fórmulas, semáforos y reglas
geográficas que la API. Si algún insumo técnico está `pending` o `error`, mobile
mantiene el resultado local y lo identifica como pendiente de sincronización;
solo lo sustituye por la respuesta de API cuando visita e insumos técnicos ya
están sincronizados. Un fallo de lectura remota no oculta el resultado local.
Los tombstones creados por versiones antiguas sin `visitaId` se contrastan por
tipo y `serverId` contra los hijos remotos de la visita; si esa verificación no
está disponible, se conserva el cálculo local.

Para sostener la identificación offline, `pest_diseases.code` conserva en SQLite
el código estable recibido del catálogo. La migración aditiva 48 rellena los
códigos conocidos y elimina la marca `catalogs_downloaded_at` para provocar una
recarga posterior sin borrar observaciones ni operaciones pendientes.

La migración PostgreSQL 043 completa para mango todas las relaciones entre el
catálogo sanitario activo, sus etapas y labores activas y los grados 0 a 3 de
incidencia y severidad. No requiere cambio de SQLite: una instalación nueva las
recibe en la descarga inicial y una instalación existente las obtiene al forzar
la actualización de catálogos o en la recarga automática posterior a 24 horas.
La descarga conserva observaciones y outbox porque estas relaciones son
catálogos de solo lectura.

## Cambios críticos

Toda nueva entidad sincronizable requiere:

- tabla y migración SQLite;
- repositorio local;
- tipo de entidad de sync;
- handler;
- endpoint remoto;
- orden respecto de la visita;
- tratamiento create/update/delete;
- reconciliación y reintento;
- pruebas offline-online;
- actualización de este documento.
