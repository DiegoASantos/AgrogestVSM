---
title: Sincronizacion robusta en redes inestables y recuperacion de sesion online
status: implemented
numero: "015"
area: mobile-sync, auth
created: 2026-07-11
approved_by: Usuario via Codex, 2026-07-11
implemented_in: apps/mobile@0.1.2 (2026-07-12)
---

# Spec 015: Sincronizacion robusta en redes inestables y recuperacion de sesion online

## Contexto

Usuarios de AgroGest Mobile reportan tres sintomas relacionados:

1. la aplicacion se degrada severamente cuando NetInfo informa conexion pero la
   red tiene alta latencia, perdida o ancho de banda muy bajo;
2. `Sincronizar ahora` puede permanecer indefinidamente en
   `Sincronizando...` sin procesar el outbox;
3. en algunos casos los datos solo llegan al servidor despues de salir y
   autenticarse de nuevo.

Esta spec revisa la implementacion derivada de la Spec 010 y la decision del
ADR-003 de depender del timeout natural de la plataforma. La evidencia actual
justifica reemplazar esa parte por limites explicitos y cancelables, sin
abandonar el modelo offline-first ni la evaluacion por resultados reales.

### Diagnostico verificado

| Hallazgo | Evidencia ejecutable | Conclusion |
| --- | --- | --- |
| El cliente HTTP no tiene timeout. | `shared/services/api/client.ts` ejecuta `fetch()` y `response.text()` sin `AbortController`. | Una Promise puede quedar pendiente segun la plataforma y retener el flujo de sync o la UI que la espera. No bloquea por si sola el hilo JS. |
| El boton fuerza refresh aunque el access token sea valido. | `home-screen.tsx` llama `scheduleSync({ forceRefresh: true })`; `use-sync.ts` usa el mismo flag para omitir backoff y para `ensureOnlineSession(true)`. | Esta es la causa mas directa de que el boton se detenga antes de procesar el outbox. |
| Los fallos de refresh no se clasifican. | `auth-session-provider.tsx` convierte cualquier error de `authService.refresh()` en `false`. | Un timeout transitorio y un refresh token rechazado por `401/403` producen el mismo estado aparente y reintentos sin recuperacion explicita. |
| El resultado del ciclo es todo-o-nada. | `use-sync.ts` registra exito solo cuando `skipped === 0 && errors === 0`. | Un skip por dependencia o un error permanente contamina la metrica de calidad de red. |
| El primer fallo puede imponer dos minutos. | `sync-manager.ts` combina una tasa inicial de 0% con `severeMinimumBackoffMs = 120000`. | La progresion real no siempre empieza en 15 segundos; la penalizacion inicial puede ser excesiva. |
| El outbox es secuencial. | `sync-engine.ts` espera cada handler en orden. | Debe mantenerse para preservar padre-hijos. Los timeouts deben acotar cada espera, no paralelizar indiscriminadamente. |
| Los catalogos pueden retener el cierre del ciclo. | `use-sync.ts` espera `refreshCatalogsIfStale()`; cuando pasan 24 horas, `seed-catalogs.ts` realiza multiples requests. | El pull de catalogos debe desacoplarse del push del outbox y tener su propio estado. |
| Los errores agotados pierden su operacion de outbox. | `sync-engine.ts` marca la entidad en `error` y elimina la entrada despues del limite. | Un reintento global seguro necesita conservar tipo, operacion y payload, incluidos deletes. |

El relogueo exitoso instala un token nuevo y da tiempo a que el backoff previo
expire, pero no demuestra que SQLite este corrupto. `sync_state` persiste por
diseno; el problema es la combinacion de refresh forzado, errores de sesion no
clasificados y una penalizacion basada en resultados demasiado agregados.

### Correcciones al diagnostico inicial

- No se afirmara un timeout nativo fijo de 60-90 segundos; varia por plataforma
  y condicion de transporte.
- No se bajara `stableSuccessRate` de 70% a 30% sin datos de campo. Una red con
  70% de fallos no debe clasificarse como estable. Primero se corregira la
  unidad de medicion.
- No se agregara un preflight bloqueante a `/health` de tres segundos. Agrega
  una request, puede rechazar 2G lento pero viable y no representa el resultado
  de endpoints autenticados ni de la base de datos.
- Un timeout de transporte si cuenta como intento, pero nunca borra datos. Al
  agotar reintentos, la operacion se conserva como fallo reintentable.
- Un timeout global no se implementara solo con `Promise.race`; el
  `AbortSignal` debe llegar al request activo para que no continue mutando
  SQLite despues de que la UI declare finalizado el ciclo.

## Objetivo

Hacer que el guardado local y la navegacion sigan siendo utilizables con red
inestable, que el sync manual termine siempre con un resultado acotado y que
la aplicacion recupere automaticamente los envios cuando la sesion y la red lo
permitan, sin perder operaciones ni exigir cerrar la aplicacion.

## Alcance

### Incluido

- timeouts HTTP cancelables y configurables por tipo de operacion;
- separacion entre omitir backoff y forzar refresh de autenticacion;
- clasificacion de refresh transitorio frente a refresh terminal;
- acceso offline cuando la sesion online requiere reautenticacion;
- correo precargado y contrasena siempre vacia al reautenticar;
- presupuesto cancelable para ciclos manuales y automaticos;
- resultados granulares del motor de outbox y backoff menos agresivo;
- persistencia durable de operaciones fallidas y reintento explicito de las
  que sean transitorias;
- boton manual siempre visible, feedback determinista y contadores reactivos;
- desacople entre push del outbox y refresco de catalogos;
- reset controlado del backoff despues de login fresco o sync manual completo;
- pruebas unitarias, integracion, migracion y escenarios offline-online.

### Excluido

- cambios en endpoints o contratos de la API;
- sincronizacion en background con la aplicacion suspendida;
- paralelizacion general del outbox;
- almacenamiento de contrasenas, autocompletado de contrasena propio o login
  biometrico;
- reintento automatico de errores permanentes o de validacion;
- telemetria remota de red o datos personales;
- despliegue, OTA, commit o push.

## Requisitos

### Cliente HTTP

- RF-001: `apiRequest()` aceptara `timeoutMs` y `signal` opcionales y mantendra
  activo el timeout hasta terminar de leer y validar el body de la respuesta.
- RF-002: el timeout por defecto sera 15 segundos para requests JSON normales
  y de sync; refresh de sesion usara 5 segundos. Catalogos podran declarar un
  timeout mayor sin cambiar el default global.
- RF-003: un timeout generara un error tipado y clasificable como transitorio,
  distinto de cancelacion solicitada por desmontaje o cierre del ciclo.
- RF-004: timers y listeners de abort se limpiaran en exito, error y
  cancelacion. No se introduciran dependencias nuevas.

### Sesion online

- RF-005: las opciones de sync separaran al menos `bypassBackoff` de
  `forceAuthRefresh`; el boton manual usara `bypassBackoff: true` y no forzara
  refresh cuando el access token siga vigente.
- RF-006: solo existira un refresh en vuelo. Tras un fallo transitorio se
  aplicara un cooldown de 60 segundos y se conservaran la sesion offline y los
  tokens existentes.
- RF-007: durante el cooldown, un access token aun vigente podra usarse. Un
  access token expirado no se enviara y el sync terminara rapido con resultado
  `auth_temporarily_unavailable`, sin request HTTP y en no mas de un segundo
  desde que comienza la validacion de sesion.
- RF-008: si refresh responde `401/403`, se limpiaran los tokens online
  rechazados, se conservaran la identidad y el acceso offline dentro de su TTL
  vigente, y se establecera el estado `online_reauth_required`.
- RF-009: la UI mostrara `Sesion online vencida; inicia sesion para sincronizar`
  con una accion de reautenticacion. El login precargara solo el correo del
  usuario; la contrasena permanecera vacia y nunca se persistira.
- RF-010: un login fresco limpiara el estado `online_reauth_required`, reiniciara
  el backoff de calidad de red y programara un sync inmediato. Debe funcionar
  aunque la sesion offline permaneciera autenticada y no hubiera transicion
  booleana `false -> true`.

### Motor y gestor de sync

- RF-011: `processOutbox()` mantendra el orden secuencial y las dependencias
  padre-hijos, pero cada request recibira el timeout y el deadline restantes.
- RF-012: el ciclo manual tendra un presupuesto total de 30 segundos y el
  automatico de 45 segundos. Al agotarse, se abortara el request activo, se
  preservaran las entradas no procesadas y `isSyncing` volvera a `false`. La UI
  podra usar hasta dos segundos adicionales para scheduling, persistencia del
  resultado y renderizado del mensaje final.
- RF-013: el resultado distinguira como minimo `processed`,
  `transientFailures`, `permanentFailures`, `dependencySkipped`,
  `unattempted` y `stoppedByAuth`. Los skips por dependencia, auth y errores
  permanentes no se usaran como fallos de calidad de red.
- RF-014: `SyncManager` registrara exitos y fallos transitorios de transporte
  realmente intentados, no un booleano global por ciclo. Se mantendra
  inicialmente `stableSuccessRate = 0.70`.
- RF-015: los intervalos automaticos seran `10s, 30s, 60s, 120s` y el minimo
  severo sera 60 segundos. El boton manual ignorara el backoff, no los limites
  de autenticacion ni el single-flight.
- RF-016: un ciclo manual que procese todos los pendientes sin fallos
  transitorios reiniciara el backoff. Un exito parcial registrara sus outcomes
  sin reset total.
- RF-017: los triggers periodico, reconexion, app activa, nueva entrada y manual
  compartiran una sola ejecucion. Los triggers automaticos se coalesceran sin
  crear una corrida inmediata extra por cada `already_running`; un solicitante
  manual esperara la ejecucion activa o una unica corrida manual encolada.

### Fallos y reintento explicito

- RF-018: una nueva tabla SQLite `sync_failures` conservara de forma durable la
  operacion agotada o permanente con `entity_type`, `entity_local_id`,
  `operation`, `payload`, `retry_count`, `error_kind`, mensaje seguro y
  timestamps.
- RF-019: al agotar el limite de un error transitorio o recibir un error
  permanente, el motor movera la operacion desde `sync_outbox` a
  `sync_failures` dentro de una transaccion y marcara la entidad en `error`
  cuando siga existiendo. No se perderan operaciones delete ni payloads.
- RF-020: errores de auth nunca se moveran a `sync_failures`; detendran el ciclo
  y conservaran el outbox sin incrementar su retry.
- RF-021: `Sincronizar ahora` procesara exclusivamente `sync_outbox` pendiente.
  `Reintentar fallidos` sera una accion separada y solo reencolara fallos
  `transient`, reiniciando su contador y estado de error de forma atomica.
- RF-022: errores `permanent` permaneceran visibles y requeriran corregir el
  dato o una accion especifica de detalle; no se reenviaran en masa.
- RF-023: la reencolacion de fallos respetara padre-hijos y la deduplicacion del
  outbox. Una edicion local mas nueva podra sustituir atomicamente un fallo
  `transient`. Un fallo `permanent` solo se resolvera cuando el usuario corrija
  y guarde explicitamente el dato desde su flujo de detalle; no se ocultara ni
  eliminara por una sincronizacion masiva.

### UI y catalogos

- RF-024: `Sincronizar ahora` permanecera visible aunque el contador local sea
  cero. Estara deshabilitado solo sin red, durante una accion incompatible o
  cuando se requiera reautenticacion; una cola vacia devolvera un resultado
  explicito sin iniciar refresh innecesario.
- RF-025: la Promise del boton siempre terminara en exito, fallo parcial,
  timeout, offline o reautenticacion requerida y mostrara un mensaje en
  espanol. Nunca quedara `Sincronizando...` despues del deadline.
- RF-026: los contadores de pendientes y errores se actualizaran despues de
  cambios de outbox/fallos y despues de ciclos automaticos, no solo al enfocar
  Home o pulsar el boton.
- RF-027: el push del outbox terminara y liberara su indicador antes de iniciar
  un refresh de catalogos. El pull usara single-flight, timeout propio y estado
  visual independiente; un fallo de catalogos no convertira un push exitoso en
  fallo de sync.

### No funcionales

- RNF-001: ningun fallo de red, timeout, cancelacion o auth borrara datos
  locales ni marcara una entidad `synced` sin confirmacion valida de API.
- RNF-002: se preservaran idempotencia, orden padre-hijos y reconciliacion de
  conflictos existentes.
- RNF-003: no se registraran tokens, contrasenas, payloads, PII ni cuerpos de
  error crudos. Los logs incluiran solo categoria, duracion, tipo de entidad y
  resultado agregado cuando sea necesario.
- RNF-004: los valores de timeout y backoff seran constantes centralizadas y
  probables con reloj y timers falsos.
- RNF-005: la implementacion seguira funcionando sobre una base SQLite creada
  por la version anterior y una version anterior de la app ignorara de forma
  segura la tabla nueva.

## Contratos afectados

### API

Sin cambios de endpoints, DTOs ni respuestas. `/health` no se incorpora como
gate del sync.

### Mobile TypeScript

- `ApiRequestOptions`: agrega `timeoutMs` y `signal`.
- `SyncRequestOptions`: reemplaza el `forceRefresh` ambiguo por opciones
  separadas para backoff y autenticacion.
- `SyncRunResult`: agrega resultados tipados de timeout, auth temporal,
  reautenticacion requerida y conteos granulares.
- `AuthSessionContext`: expone el estado de sesion online y un evento/revision
  observable de login fresco.
- `processOutbox()`: devuelve outcomes granulares y acepta contexto cancelable.

### SQLite

Nueva tabla aditiva `sync_failures`. No se modifican PostgreSQL/PostGIS ni el
contrato remoto. El esquema final se definira en `schema.ts` y en la siguiente
migracion incremental disponible al implementar.

DDL conceptual obligatorio:

```sql
CREATE TABLE IF NOT EXISTS sync_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_local_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('create', 'update', 'delete')),
  payload TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK(retry_count >= 0),
  error_kind TEXT NOT NULL CHECK(error_kind IN ('transient', 'permanent')),
  error_message TEXT,
  outbox_created_at TEXT NOT NULL,
  last_attempt_at TEXT NOT NULL,
  failed_at TEXT NOT NULL,
  UNIQUE(entity_type, entity_local_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_failures_kind_failed_at
  ON sync_failures(error_kind, failed_at);
```

La implementacion debe validar `entity_type` contra los tipos soportados antes
de insertar o reencolar. `payload` conserva el mismo valor nullable del outbox;
para un delete transitorio debe conservar la identidad remota necesaria y la
accion `Reintentar fallidos` debe poder reencolarlo sin reconstruir datos.

## Diseno de estados

### Sesion

```text
online_valid
  | refresh transitorio
  v
online_temporarily_unavailable -- cooldown/refresh exitoso --> online_valid
  | refresh 401/403
  v
online_reauth_required -- login fresco --> online_valid

En los tres estados, el acceso offline se conserva mientras su TTL local sea
valido. Solo online_valid puede enviar el outbox.
```

### Operacion local

```text
sync_outbox pending
  | exito API                         -> synced, borrar outbox
  | transitorio bajo limite          -> pending, retry_count + 1
  | transitorio agotado/permanente   -> transaccion a sync_failures + error
  | auth                              -> conservar pending y detener

sync_failures transient
  | Reintentar fallidos              -> transaccion a sync_outbox pending

sync_failures permanent
  | corregir/editar dato             -> nuevo outbox prevalece sobre el fallo
```

## Seguridad y datos

- La identidad offline existente puede conservarse, pero los access/refresh
  tokens rechazados deben eliminarse de `SecureStore` para evitar loops y
  replay accidental.
- El correo se obtiene de los metadatos de usuario ya persistidos y se usa solo
  para precargar el login. No se introduce un almacen adicional de contrasena.
- El mensaje de reautenticacion no debe revelar si la cuenta fue desactivada,
  revocada o expiro; la API conserva la decision de autenticacion.
- El cooldown evita abuso involuntario del endpoint de refresh bajo una red
  intermitente y respeta el single-flight existente.
- `sync_failures.payload` contiene la misma informacion local que hoy reside en
  `sync_outbox`; conserva el mismo acceso local y nunca se envia a logs.

## Migracion y rollback

### Avance

1. Agregar `sync_failures` mediante una migracion SQLite aditiva e idempotente.
2. Desplegar codigo que mueva fallos en transaccion y consulte ambas colas para
   contadores, detalle y reintento.
3. Mantener intactas las entradas pendientes existentes y el `sync_state`
   actual; el nuevo gestor podra normalizarlo mediante `resetState()` solo en
   los eventos definidos.
4. No reconstruir automaticamente operaciones antiguas ya eliminadas por
   versiones previas. Esos errores conservaran su flujo de detalle existente;
   no se fabricaran deletes ni payloads sin evidencia.

### Compatibilidad

- Una base anterior migra hacia adelante sin borrar outbox ni entidades.
- Una app anterior ignora `sync_failures`; no reintenta esos fallos, pero
  tampoco los pierde. Al volver a la version nueva, siguen disponibles.
- La escritura de una edicion nueva debe resolver de forma transaccional un
  fallo previo equivalente para evitar dos operaciones competidoras.

### Rollback

- Preferir rollback de codigo sin eliminar `sync_failures`. La tabla queda
  inerte para una correccion hacia adelante posterior.
- Antes de volver a una version anterior, finalizar o cancelar el ciclo activo.
- No ejecutar `DROP TABLE`, limpiar outbox ni reconstruir SQLite como rollback
  rutinario. Si se requiere recuperar operaciones fallidas, volver a desplegar
  la version compatible y reencolarlas desde la accion explicita.

## Criterios de aceptacion

- [ ] CA-001: con una request que nunca responde, el deadline cancela trabajo a
  los 30 segundos y el boton libera `Sincronizando...` en no mas de 32 segundos
  de tiempo visible total, conservando los pendientes.
- [ ] CA-002: con access token valido, `Sincronizar ahora` no llama
  `/auth/refresh` y omite el backoff vigente.
- [ ] CA-003: un refresh con timeout termina en aproximadamente 5 segundos,
  conserva acceso offline y no repite refresh durante 60 segundos.
- [ ] CA-003a: con access token expirado durante el cooldown, la validacion
  devuelve `auth_temporarily_unavailable` sin HTTP y en no mas de un segundo.
- [ ] CA-004: un refresh `401/403` muestra el mensaje de sesion online vencida,
  detiene nuevos intentos automaticos y conserva el trabajo local.
- [ ] CA-005: la reautenticacion precarga solo el correo, exige contrasena y,
  tras login exitoso, resetea backoff e inicia sync sin reiniciar la app.
- [ ] CA-006: nueve operaciones exitosas y una con timeout registran 90% de
  exito de transporte; skips dependientes y errores permanentes no reducen esa
  tasa.
- [ ] CA-007: un fallo del padre impide enviar hijos en el mismo ciclo y todos
  conservan una ruta de reintento sin duplicados.
- [ ] CA-008: al agotar un timeout, la operacion completa queda en
  `sync_failures` como transitoria; no se pierde payload ni delete.
- [ ] CA-009: `Sincronizar ahora` no toca `sync_failures`; `Reintentar fallidos`
  reencola solo transitorios, incluidos deletes con contexto durable, en orden
  padre-hijos.
- [ ] CA-010: un error permanente sigue visible y no es reenviado por la accion
  masiva; solo un guardado correctivo explicito desde el detalle lo sustituye.
- [ ] CA-011: el boton manual siempre es visible y los contadores reflejan
  ciclos automaticos sin cambiar de pantalla.
- [ ] CA-012: un refresco de catalogos stale no mantiene el push en estado
  `Sincronizando...` ni cambia su resultado.
- [ ] CA-013: cerrar y abrir la app durante backoff o con fallos preserva outbox,
  `sync_failures` y acceso offline; un login fresco recupera el envio.
- [ ] CA-014: ninguna prueba de timeout deja timers abiertos, requests activos o
  escrituras SQLite posteriores al resultado final.
- [ ] CA-015: migrar una base de la version anterior conserva el numero y
  contenido de entradas pendientes y permite rollback de codigo sin perdida.

## Pruebas

### Unitarias

- cliente HTTP: exito, timeout antes de headers, timeout durante body,
  cancelacion externa, limpieza de timers y override por request;
- auth provider: token valido sin refresh, single-flight, timeout/cooldown,
  access token vigente durante cooldown, refresh `401/403`, login fresco y
  persistencia exclusiva de correo/tokens permitidos;
- SyncManager: outcomes granulares, skips excluidos, nuevos intervalos, reset y
  reloj invalido;
- sync engine: deadline, continuacion tras transitorio, auth stop, movimiento
  transaccional a fallos y orden padre-hijos;
- sync requests/use-sync: coalescing, manual durante corrida activa, promesas
  siempre resueltas y separacion de catalogos.

### Integracion SQLite

- migracion desde la version inmediatamente anterior con outbox poblado;
- movimiento atomico outbox -> fallos y fallos -> outbox;
- recuperacion despues de cierre entre intentos;
- deduplicacion cuando una entidad fallida recibe una edicion nueva;
- conservacion de payload para create, update y delete;
- compatibilidad de lectura con la tabla nueva ignorada por codigo anterior.

### Offline-online y manual

- guardar una visita completa offline, reconectar con 2G simulado y verificar
  que la UI sigue navegable mientras el push progresa;
- expirar access token con refresh transitorio y luego recuperacion de red;
- revocar refresh token, continuar trabajando offline, reautenticar sin cerrar
  la app y completar el outbox;
- mezclar exito, timeout, error permanente y dependencia de padre en un ciclo;
- catalogos stale durante un push exitoso;
- reinicio de app con backoff, pendientes y fallos persistidos.

### Validacion proporcional

- pruebas focalizadas de mobile y suite offline-online;
- `pnpm --filter @agrogest/mobile lint`;
- `pnpm --filter @agrogest/mobile typecheck`;
- `pnpm --filter @agrogest/mobile build`;
- validacion manual Android con throttling, perdida de paquetes y cambio
  offline/online;
- revision de seguridad de auth/tokens y revision independiente del diff.

## Despliegue y observabilidad

- Entregar como una sola version compatible de mobile despues de probar la
  migracion sobre una copia local representativa.
- No cambiar secretos ni variables de entorno.
- Registrar en desarrollo duracion y resultado agregado de sync, nunca tokens,
  correo, payloads ni mensajes crudos del servidor.
- Antes de OTA/release, aplicar `agrogest-release-check` y verificar que el
  runtime version sea compatible con la migracion SQLite.

## Impacto documental

- [x] Spec 010: esta spec revisa RF-008 (timeout natural) y precisa RNF-003
  (persistencia de backoff con reset controlado, no borrado al reiniciar).
- [ ] Arquitectura: actualizar `docs/architecture/mobile-offline-sync.md` al
  implementar.
- [ ] ADR: crear un ADR que sustituya parcialmente ADR-003 respecto a timeouts,
  outcomes granulares y fallos durables.
- [ ] Seguridad: actualizar la linea base si cambia el estado de sesion offline.
- [ ] Runbook: documentar diagnostico, fallos reintentables y recuperacion.
- [ ] Riesgos: registrar pruebas reales pendientes en redes rurales.
- [x] Dominio y contrato API: sin cambios.
- [x] Variables o despliegue: sin variables nuevas; requiere control de version
  mobile por la migracion SQLite.
