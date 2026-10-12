---
title: Recuperacion de visitas antiguas con receta sin frecuencia
status: implemented
numero: "097"
area: mobile, visitas, recetas, sqlite, outbox, api, reportes
created: 2026-10-12
approved_by: usuario (instruccion "si apruebo", 2026-10-12)
implemented_in: apps/mobile/src/shared/sync; apps/mobile/src/modules/visita-recetas/services/producer-recipe-mixture-plan.ts; apps/api/src/modules/visitas-campo/application/visitas-campo.service.ts; apps/admin-web/src/modules/visitas/services/visita-pdf-web.service.ts; docs/architecture/mobile-offline-sync.md; docs/domain/data-model.md; docs/runbooks/incident-response.md; docs/operations/risk-register.md
---

# Spec 097: Recuperacion de visitas antiguas con receta sin frecuencia

## Contexto

Algunas visitas antiguas tienen una receta local cuyo intento de finalizacion
fallo con `Completa la frecuencia de dosis de la mezcla N.`. El fallo permanente
queda en `sync_failures` y la receta aparece en el dialogo de errores. Esto
tambien ocurre con recetas que contienen productos: sus recomendaciones no
deben perderse. El usuario solicita corregir este caso para todos los
agronomos y fijar la hora de fin de cada visita afectada en inicio mas diez
minutos.

La API ya permite guardar recetas sin frecuencia mediante `POST
/visitas-campo/:visitaId/receta`; solo la finalizacion exige frecuencia. La
recuperacion puede usar ese guardado compatible despues de actualizar la hora
de fin de la visita, sin inventar una pauta de aplicacion.

## Alcance

### Incluido

- Recuperar los fallos locales de `visita_recetas` cuyo mensaje corresponda
  exactamente a la falta de frecuencia de una mezcla.
- Incluir recetas con productos fitosanitarios, fertilizantes, riego o labores,
  asi como agregados vacios historicos. Conservar todo el contenido existente.
- Actualizar la hora final de la visita afectada a hora inicial mas diez
  minutos, aun cuando ya exista otra hora final.
- Reencolar la visita y la receta en orden padre-hijo para el usuario dueno de
  los registros; ejecutar la recuperacion en cada dispositivo de cada
  agronomo al volver a usar la app.
- Guardar la receta recuperada con el endpoint compatible y mostrar la
  frecuencia ausente como `Pendiente` en los PDF de receta.
- Aceptar en la API la hora final exactamente diez minutos despues de la
  inicial cuando el calculo cruza medianoche.

### Excluido

- Completar una frecuencia de dosis por inferencia o con un valor ficticio.
- Relajar la validacion de frecuencia para recetas nuevas que el agronomo
  finaliza normalmente.
- Ocultar otros errores de sincronizacion o marcar como sincronizada una
  entidad sin confirmacion de la API.
- Modificar datos de produccion directamente, desplegar u obligar a los
  dispositivos a sincronizar sin sesion.

## Requisitos

- RF-001: Identificar solo fallos permanentes del usuario actual, con
  `entity_type = visita_recetas`, entidad local existente y mensaje que
  coincida con `Completa la frecuencia de dosis de la mezcla <numero>.`.
- RF-002: La reparacion debe conservar receta, mezclas, productos,
  fertilizacion, riego, labores e identidades locales y remotas.
- RF-003: Para cada visita elegible, calcular `end_visit_time` desde
  `start_visit_time` mas diez minutos, con formato de 24 horas y cambio de dia
  cuando corresponda. Reencolar el `update` de la visita antes de la receta.
- RF-004: El reintento de la receta elegible usa el guardado compatible. La
  ruta normal de finalizacion sigue exigiendo frecuencia para mezclas con
  productos.
- RF-005: El dialogo deja de contar el fallo de frecuencia al pasar la receta
  a pendiente; solo pasa a sincronizada tras respuesta exitosa. Si aparece
  otro rechazo real, se registra y muestra ese nuevo error.
- RF-006: Los reportes de receta muestran `Pendiente` cuando la frecuencia de
  una mezcla con productos esta ausente; no presentan una pauta inexistente.
- RF-007: La reparacion cubre los datos locales de cada agronomo cuando su
  dispositivo ejecute la version corregida, con o sin conectividad en ese
  momento. La sincronizacion completa ocurre al recuperar conectividad.
- RNF-001: Reencolado, cambio de hora y retiro del fallo son atomicos por
  visita; la operacion es idempotente tras reinicio y reintentos.
- RNF-002: Se respeta `owner_user_id` y `agronomist_user_id`; no se leen ni
  modifican registros de otro usuario autenticado.
- RNF-003: No se borran recetas, productos, visitas ni otros errores y no se
  registran datos personales o payloads en logs.

## Contratos afectados

- API: la validacion de horas de `visitas_campo` admite el caso especifico de
  diez minutos que cruza medianoche. `POST /receta` y `PUT
  /receta/finalizacion` conservan sus contratos y validaciones de frecuencia.
- SQLite: no hay cambio de esquema; se actualizan datos de `visitas_campo`,
  `visita_recetas`, `sync_failures` y `sync_outbox` del usuario actual.
- PostgreSQL: no hay migracion ni actualizacion masiva. La API recibe las
  modificaciones por sincronizacion normal.
- Reportes mobile y web: el valor ausente de frecuencia se muestra como
  `Pendiente`.

## Seguridad y datos

La receta puede contener recomendaciones agronomicas incompletas. Se conserva
el campo `frecuenciaDosis` vacio y se indica de forma visible que la frecuencia
esta pendiente, sin sugerir una aplicacion. La recuperacion verifica el dueno
local y nunca usa el mensaje de error como unico criterio si falta la entidad
o la visita padre. Los guards existentes de la API siguen aplicando.

## Migracion y rollback

- Avance: distribuir la version mobile con reparacion local; cada agronomo
  inicia sesion y su dispositivo reencola los registros afectados. La API con
  validacion de medianoche se despliega antes que mobile. No hay migracion de
  esquema ni operacion directa sobre produccion.
- Compatibilidad: las versiones anteriores de mobile siguen funcionando; el
  endpoint legacy de guardado ya acepta frecuencias vacias. El cambio de hora
  nocturna es aditivo y limitado a una diferencia de diez minutos.
- Rollback: desactivar la reparacion mediante una version correctiva. Las
  operaciones pendientes y los datos locales permanecen; no se restaura una
  hora previa automaticamente. Si una receta ya se guardo en el servidor,
  conservarla y corregir hacia adelante. No borrar la cola como rollback.

## Criterios de aceptacion

- [x] CA-001: Una receta historica sin productos con el error indicado sale
  del dialogo, y su visita termina diez minutos despues del inicio.
- [x] CA-002: Una receta historica con productos y el mismo error conserva
  todos los productos y sincroniza con frecuencia pendiente.
- [x] CA-003: Una visita de 10:30 termina a las 10:40; una de 23:55 termina
  a las 00:05 y la API acepta ese caso.
- [x] CA-004: Otros errores y recetas nuevas incompletas conservan sus
  validaciones normales.
- [x] CA-005: La reparacion aislada por usuario es idempotente, funciona
  offline y completa la sincronizacion cuando vuelve la conexion.
- [x] CA-006: Un rechazo distinto despues del reintento permanece visible
  como error real; no se informa exito falso.
- [x] CA-007: Los PDF mobile y web identifican explicitamente la frecuencia
  pendiente de una mezcla con productos.

## Pruebas

- Unitarias de seleccion de fallos, calculo de hora, aislamiento por usuario
  y eleccion del endpoint de guardado.
- Integracion SQLite de transaccion, outbox, reintento, reinicio y
  preservacion de productos.
- API: diferencia normal de horas, diez minutos al cruzar medianoche y
  rechazo de horas anteriores que no correspondan al caso permitido.
- Offline-online: visita padre antes de receta, confirmacion remota y error
  posterior distinto.
- PDF mobile y web con frecuencia ausente y presente.

Validacion realizada el 2026-10-12: `pnpm check` (suite completa),
`pnpm test:coverage`, `pnpm build` y `git diff --check`. Las pruebas de
recuperacion cubren seleccion del fallo, orden visita-receta, cruce de
medianoche, aislamiento por usuario e idempotencia del reencolado.

## Impacto documental

- [x] Arquitectura de sincronizacion mobile.
- [x] Modelo de dominio de visitas y recetas.
- [x] Runbook de recuperacion de errores de sincronizacion.
- [x] Registro de riesgos si quedan dispositivos sin actualizar.
- [x] ADR: no aplica; se usan contratos y outbox existentes.
- [x] Variables o despliegue: documentar orden API y mobile; sin variables.
