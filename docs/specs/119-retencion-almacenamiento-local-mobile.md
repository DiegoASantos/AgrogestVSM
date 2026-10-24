---
title: Retencion del almacenamiento local en mobile
status: implemented
numero: 119
area: mobile, sqlite, sync
created: 2026-10-24
approved_by: usuario, 2026-10-24
implemented_in: apps/mobile/src/shared/database/local-storage-cleanup.ts, apps/mobile/src/shared/database/local-storage-cleanup.test.ts, apps/mobile/src/shared/sync/sync-engine.ts, apps/mobile/src/shared/connectivity/connectivity-context.tsx, docs/architecture/mobile-offline-sync.md; 2026-10-24
---

# Spec 119: Retencion del almacenamiento local en mobile

## Contexto

La app mobile conserva datos offline en SQLite y archivos locales. Las visitas
tecnicas sincronizadas pueden permanecer indefinidamente en el dispositivo y
ocupar espacio. Se necesita una limpieza automatica que reduzca el uso local sin
perder operaciones pendientes ni afectar el historial almacenado en el servidor.

## Alcance

### Incluido

- Retener en el dispositivo las visitas tecnicas sincronizadas de los ultimos
  90 dias calendario.
- Eliminar del SQLite local las visitas tecnicas sincronizadas anteriores al
  limite y todos sus detalles dependientes.
- Purgar caches climaticas vencidas usando su `expires_at` existente.
- Mantener la limpieza actual de fotos comerciales sincronizadas y limpiar
  archivos temporales propios de la app que tengan mas de 24 horas y no esten
  referenciados por SQLite.
- Ejecutar limpieza automaticamente al iniciar la app y despues de una
  sincronizacion exitosa, con una frecuencia maxima de una vez por dia.
- Liberar espacio de SQLite/WAL tras una purga efectiva, sin bloquear el inicio
  ni el flujo de sincronizacion.

### Excluido

- Eliminar o modificar visitas en el servidor.
- Retener o purgar pagos, cosecha, visitas comerciales, productores, parcelas,
  catalogos, borradores o datos de otros modulos.
- Borrar filas `pending` o `error`, operaciones de `sync_outbox` o fallos de
  `sync_failures`.
- Agregar controles manuales, limites configurables por usuario o nuevas
  dependencias.

## Requisitos

- RF-001: El limite se calcula como la fecha calendario actual en `America/Lima`
  menos 90 dias; se compara con `visitas_campo.visit_date`.
- RF-002: Solo son elegibles visitas tecnicas con `sync_status = 'synced'` cuya
  fecha sea anterior al limite.
- RF-003: Una visita se purga unicamente si el agregado completo esta
  sincronizado y no tiene entradas asociadas en `sync_outbox` ni en
  `sync_failures`, y no tiene borradores persistentes asociados. Si una tabla
  hija conserva trabajo pendiente o error, se conserva la visita y el agregado
  completo.
- RF-004: La eliminacion del padre y sus detalles se realiza en una transaccion
  SQLite, respetando las relaciones padre-hijo y sin dejar filas huerfanas.
- RF-005: La purga local no elimina ni cambia los registros historicos del
  backend.
- RF-006: Caches de clima de parcela, distrito y estacion con `expires_at`
  anterior al momento de limpieza se eliminan. La cache vigente se conserva.
- RF-007: Los archivos temporales solo se borran si pertenecen a directorios y
  patrones creados por la app, superan 24 horas y no tienen referencia en la
  base local. No se recorren ni borran archivos arbitrarios del dispositivo.
- RF-008: Se conserva la limpieza existente de fotos comerciales sincronizadas;
  nunca se eliminan fotos con sync pendiente/error o referenciadas por una
  operacion pendiente/fallida.
- RF-009: La limpieza se intenta en arranque y tras sync exitoso, pero se limita
  a una ejecucion cada 24 horas mediante `app_meta`. Un fallo de limpieza no
  impide abrir la app ni completar sync, y permite reintentar en la siguiente
  oportunidad.
- RF-010: Tras borrar filas, SQLite realiza checkpoint WAL y reclama espacio
  del archivo de base de datos con una operacion de compactacion segura fuera
  de transacciones. La compactacion se omite si no hubo borrados.
- RNF-001: La limpieza no elimina datos sincronizados recientes ni cambia el
  orden, idempotencia o recuperacion del outbox.
- RNF-002: La operacion debe ser idempotente, acotada y tolerar cierres de app;
  una interrupcion no puede dejar el agregado de una visita parcialmente
  eliminado.
- RNF-003: La limpieza no debe ejecutarse dentro de una migracion SQLite ni
  mantener bloqueado el hilo de interfaz durante una purga extensa.

## Contratos afectados

- SQLite local: sin cambios de esquema; `app_meta` almacena el ultimo instante
  de limpieza exitosa.
- Sync mobile: se integra como tarea de mantenimiento posterior a inicializacion
  y sync exitoso, sin cambiar payloads, endpoints ni tipos de outbox.
- Filesystem mobile: limpieza limitada a archivos temporales administrados por
  la app y al mecanismo existente de fotos comerciales sincronizadas.
- API/PostgreSQL: sin cambios.

## Seguridad y datos

- Los registros de visitas y sus detalles eliminados son copias locales de
  informacion ya confirmada por el servidor; la purga local no envia operaciones
  `delete` ni afecta datos remotos.
- La elegibilidad debe inspeccionar la visita, tablas hijas y las referencias de
  sync antes de borrar; cualquier duda o inconsistencia excluye esa visita de la
  purga.
- Los borradores sin finalizar se mantienen independientemente de su antiguedad.
- No registrar payloads personales ni contenido de visitas en logs de limpieza.

## Migracion y rollback

- No se requiere migracion estructural. El dato de ultima limpieza se guarda en
  `app_meta`; instalaciones anteriores sin esa clave ejecutan la primera
  limpieza al inicio.
- El servidor conserva las visitas purgadas localmente. El rollback de codigo
  detiene futuras purgas, pero no restaura automaticamente filas locales; estas
  vuelven a estar disponibles al sincronizar/descargar del servidor.
- Verificar que el backend permita recuperar el historial local requerido antes
  de distribuir la politica de purga.

## Criterios de aceptacion

- [x] CA-001: Una visita sincronizada con fecha anterior a 90 dias se elimina
  junto con todos sus detalles, en una unica transaccion.
- [x] CA-002: Visitas dentro de los 90 dias se conservan.
- [x] CA-003: Visitas antiguas pendientes, fallidas, con borrador o con
  outbox/fallos en cualquier nivel del agregado y todos sus detalles se
  conservan.
- [x] CA-004: Pagos, cosecha, visitas comerciales, productores, parcelas,
  catalogos y borradores no se modifican.
- [x] CA-005: Solo caches climaticas vencidas y archivos temporales propios
  elegibles se eliminan.
- [x] CA-006: Limpiezas repetidas son idempotentes; errores se registran sin
  datos sensibles y permiten reintento.
- [x] CA-007: La limpieza ocurre como maximo una vez por dia, en arranque o
  despues de sync, sin interferir con la sincronizacion.
- [x] CA-008: El checkpoint/compactacion libera espacio tras una purga y no se
  ejecuta cuando no se elimino nada.
- [x] CA-009: La consulta offline mantiene disponibles las visitas dentro del
  periodo de retencion y las eliminadas localmente permanecen en el servidor.

## Pruebas

- Unitarias: fecha de corte Lima, elegibilidad, frecuencia, caches vencidas,
  temporales elegibles y ausencia de borrados sin cambios.
- SQLite real: borrado atomico del agregado; visitas recientes y estados
  `pending`/`error`; referencias directas e indirectas de outbox/fallos; claves
  foraneas y rollback ante fallo a mitad de la purga.
- Integracion offline-online: arranque offline, sync exitoso que envejece datos,
  siguiente sync, cierre durante limpieza y recuperacion al reabrir.
- Filesystem: foto pendiente preservada, foto sincronizada manejada por limpieza
  existente, temporal viejo elegible borrado y archivo ajeno/intacto preservado.
- Validacion manual en dispositivo: tiempo de inicio, espacio antes/despues,
  WAL, consulta offline y recuperacion de historial desde servidor.

## Impacto documental

- [ ] Arquitectura mobile offline y politica de retencion local.
- [ ] Modelo de dominio.
- [ ] Runbook de soporte/recuperacion de datos mobile.
- [ ] ADR.
- [ ] Variables o despliegue.
