---
title: Recuperacion de sincronizacion de visitas mobile
status: implemented
numero: "081"
area: mobile, visitas, sqlite, outbox, sincronizacion, ux, operaciones
created: 2026-09-10
approved_by: usuario mediante instruccion "Implement the plan", 2026-09-10
implemented_in: apps/mobile/src/shared/database/sync-outbox.ts; apps/mobile/src/shared/sync; apps/mobile/src/modules/home; docs/architecture/mobile-offline-sync.md; docs/runbooks/incident-response.md; docs/runbooks/deploy-mobile-expo.md
---

# Spec 081: Recuperacion de sincronizacion de visitas mobile

## Contexto

Dispositivos de agronomos conservan cientos de registros en SQLite y outbox,
pero la web no refleja toda la informacion. Las operaciones `update` de
`visitas_campo` entran en el flujo idempotente de creacion, que puede confirmar
la visita existente sin aplicar sus cambios. Ademas, el motor solo carga una
ventana global de 100 padres antes que sus hijos, por lo que una cola grande no
produce visitas completas de forma equitativa. La interfaz registra como
exitosa una ejecucion parcial y presenta la hora de encolado como actualizacion.

## Alcance

### Incluido

- Corregir `create` y `update` de visitas y usar la identidad remota de parcela.
- Ordenar la cola completa por dependencias y por agregado de visita.
- Reencolar una sola vez las visitas locales con identidad remota afectadas por
  el falso exito.
- Diferenciar intento parcial de sincronizacion completa en la interfaz.
- Pruebas de colas grandes, reinicio, dependencias, recuperacion y offline-online.

### Excluido

- Cambios en endpoints, DTO, PostgreSQL o panel web.
- Borrar pendientes, fallos permanentes o datos locales.
- Paralelizar solicitudes de sincronizacion.
- Publicar OTA, commit o push sin autorizacion humana especifica.

## Requisitos

- RF-001: `create` usa `POST`; `update` con `server_id` usa `PATCH`; un update
  legado sin `server_id` usa el `POST` idempotente.
- RF-002: el payload de visita envia `parcelas.server_id`, nunca el ID local.
- RF-003: solo una confirmacion valida de API permite marcar una entidad como
  sincronizada y retirar su entrada del outbox.
- RF-004: el motor considera toda la cola del usuario y mantiene el orden de
  catalogos, parcelas y agregados de visita; dentro de cada agregado procesa el
  padre antes que evaluaciones, observaciones, notas, riego, labores, receta y
  calificaciones.
- RF-005: una dependencia bloqueada no impide procesar otros agregados
  elegibles y el presupuesto temporal vigente sigue limitando cada ejecucion.
- RF-006: una reparacion por usuario reencola como `update` cada visita activa
  con `server_id`, excepto si ya tiene `create`, `update`, `delete` o un fallo
  durable, o si la visita ya esta marcada como `error`. Reencolado y marcador
  se guardan atomicamente en `app_meta`.
- RF-007: una ejecucion con pendientes restantes se informa como parcial con
  cantidades enviadas, bloqueadas y restantes. La ultima sincronizacion
  completa solo cambia cuando outbox y errores quedan en cero.
- RF-008: el detalle pendiente llama `Encolado` a la fecha de `sync_outbox`.
- RNF-001: preservar aislamiento por usuario, idempotencia, reintentos,
  recuperacion tras cierre y procesamiento secuencial.
- RNF-002: no agregar dependencias nativas ni una migracion SQLite; el cambio
  debe ser compatible con OTA y el runtime instalado.
- RNF-003: no registrar payloads ni datos personales en logs.

## Contratos afectados

- API y tipos compartidos: sin cambios.
- SQLite: sin cambio de esquema; nueva clave por usuario en `app_meta` para la
  reparacion unica.
- Mobile interno: `SyncRunStatus` incorpora `partial` y `SyncRunResult`
  incorpora `remainingPending`.

## Seguridad y datos

La recuperacion opera solo sobre visitas cuyo `agronomist_user_id` coincide con
la sesion local. No toca fallos durables ni operaciones de borrado. Los datos se
mantienen en SQLite y no se envian a terceros ni se incluyen en logs.

## Migracion y rollback

- Avance: aplicar el handler corregido, ejecutar una reparacion atomica por
  usuario y drenar el outbox con el planificador nuevo.
- Compatibilidad: la API productiva ya expone `POST` y `PATCH`; no hay cambio de
  esquema ni dependencia nativa.
- Rollback: usar una OTA correctiva que desactive el reencolado pero conserve el
  handler `PATCH`. No volver al handler defectuoso mientras existan updates
  pendientes. El marcador y el outbox se conservan; no se borran datos.

## Criterios de aceptacion

- [x] CA-001: create y update de visita llaman al endpoint correcto con la
      parcela remota.
- [x] CA-002: una cola de mas de 300 registros permite completar agregados sin
      monopolio de los primeros 100 padres.
- [x] CA-003: la reparacion se ejecuta una sola vez por usuario, sobrevive a
      reinicios y no reemplaza operaciones ni fallos existentes.
- [x] CA-004: una visita completa creada offline llega en orden a la API, una
      modificacion posterior usa PATCH y la cola termina en cero.
- [x] CA-005: la UI no anuncia exito completo cuando quedan pendientes y
      diferencia ultimo intento de ultima sincronizacion completa.
- [x] CA-006: no se pierden datos ni se crean duplicados al reintentar.

## Pruebas

- unitarias de handler, identidad remota, planificador y resultado parcial;
- integracion SQLite de recuperacion atomica, aislamiento y reinicio;
- escenario offline-online con visita, hijos y receta;
- regresion con una cola equivalente a 328 entradas;
- lint, typecheck, pruebas y build mobile; gates canonicos proporcionales.

## Impacto documental

- [x] Arquitectura offline.
- [x] Runbook de incidentes y despliegue mobile.
- [x] Registro de riesgos.
- [x] Indices de documentacion y specs.
- [x] Dominio y ADR: no aplican; no cambia el modelo de negocio ni la decision
      arquitectonica offline-first.
