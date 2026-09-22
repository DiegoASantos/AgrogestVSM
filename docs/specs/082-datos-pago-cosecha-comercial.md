---
title: Datos de pago de cosecha en Comercial
status: implemented
numero: 082
area: mobile, api, database, sync
created: 2026-09-22
approved_by: usuario
implemented_in: apps/api/src/modules/comercial; apps/api/src/database/migrations/062-pagos-cosecha.ts; apps/mobile/src/modules/comercial; apps/mobile/src/shared/database/migrations.ts; apps/mobile/src/shared/sync
---

# Spec 082: Datos de pago de cosecha en Comercial

## Contexto

El módulo Comercial necesita su primer paso operativo: capturar los datos del
acreedor para el pago de cosecha, aun cuando el dispositivo no tenga conexión.

## Alcance

### Incluido

- pestaña Comercial en la navegación inferior mobile;
- formulario para productor, nombres y apellidos del acreedor, DNI/RUC, número
  de documento, banco y número de cuenta o CCI;
- DNI predeterminado; validación de 8 dígitos para DNI, 11 para RUC y hasta 30
  dígitos para cuenta/CCI;
- persistencia local, outbox, reintento idempotente y sincronización a API;
- tabla PostgreSQL y endpoint `POST /comercial/pagos-cosecha` para `ADMIN` y
  `AGRONOMO`.

### Excluido

- el segundo paso de Comercial;
- edición, eliminación, listado y reportes de pagos;
- cifrado de la base SQLite; el riesgo fue aceptado expresamente para esta
  primera entrega y queda registrado como R-037.

## Requisitos

- RF-001: el usuario autenticado puede seleccionar un productor visible en su
  catálogo y guardar varios pagos históricos para él.
- RF-002: el backend comprueba de nuevo que el productor sea visible para el
  actor antes de crear el pago o devolver un reintento idempotente.
- RF-003: los bancos válidos son `INTERBANK`, `BCP`, `CAJA_PIURA` y `BBVA`.
- RNF-001: SQLite y PostgreSQL aplican restricciones equivalentes a las de la
  validación compartida.
- RNF-002: un pago pendiente solo se reconcilia y sincroniza con el usuario
  propietario de la sesión que lo creó.

## Contratos afectados

- Validación compartida: `HarvestPaymentInput` y `harvestPaymentSchema`.
- API: `POST /comercial/pagos-cosecha`; el cliente envía `publicId` UUID para
  idempotencia junto con el productor remoto y los campos del acreedor.
- PostgreSQL: tabla aditiva `pagos_cosecha`, migración 062.
- SQLite: tabla `pagos_cosecha`, migración 73 y tipo `pagos_cosecha` en el
  outbox. La operación actual es solo `create`.

## Seguridad y datos

Los números de documento y de cuenta son datos personales. No se incluyen en
logs ni en mensajes de error. La API exige JWT, roles `ADMIN` o `AGRONOMO` y
reutiliza la comprobación horizontal del productor. La clave idempotente no
permite recuperar un pago de otro productor visible: se vuelve a autorizar el
productor almacenado.

La copia SQLite queda sin cifrado por decisión explícita del solicitante. El
aislamiento por `owner_user_id`, el almacenamiento seguro del token y el acceso
físico controlado del dispositivo reducen el riesgo, pero no reemplazan el
cifrado en reposo.

## Migración y rollback

El avance es aditivo: desplegar migración PostgreSQL 062 y API compatible antes
de distribuir la versión mobile que aplica SQLite 73. La migración local crea
una tabla nueva y no modifica pagos ni colas anteriores. El rollback operativo
consiste en retirar la ruta y la versión mobile; la tabla PostgreSQL se conserva
para evitar pérdida de registros y se corrige hacia adelante.

## Criterios de aceptación

- [x] CA-001: Comercial aparece entre las cuatro pestañas inferiores.
- [x] CA-002: el formulario aplica los catálogos y longitudes solicitados.
- [x] CA-003: guardar sin conexión crea el registro y su entrada de outbox en
      una misma transacción.
- [x] CA-004: al sincronizar, el productor pendiente se envía antes del pago y
      el reintento con el mismo `publicId` no duplica datos.
- [x] CA-005: la API deniega productores no visibles para el agrónomo.

## Pruebas

- unitarias de esquema compartido para DNI, RUC, banco y CCI;
- typecheck y lint de validation, API y mobile;
- validación manual: guardar offline, reiniciar la app, recuperar conectividad
  y confirmar estado sincronizado.

## Impacto documental

- [x] Arquitectura de sincronización mobile.
- [x] Dominio.
- [x] Línea base de seguridad y registro de riesgos.
- [x] Índice de specs.
