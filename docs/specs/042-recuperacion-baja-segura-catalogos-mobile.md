---
title: Recuperacion y baja segura de catalogos creados desde mobile
status: implementing
numero: 042
area: mobile, sync, sqlite, api, postgresql, catalogos, operaciones
created: 2026-08-16
approved_by: usuario, 2026-08-16
implemented_in:
---

# Spec 042: Recuperacion y baja segura de catalogos creados desde mobile

## Contexto

Un agronomo creo ingredientes activos, marcas comerciales y fertilizantes desde
mobile. Algunos datos fueron incorrectos y se eliminaron fisicamente en
PostgreSQL. El dispositivo conservo su copia SQLite y operaciones de sync. Ocho
fertilizantes terminaron en `sync_failures` con el mensaje generico
`Validation failed.`; el motor no marca estos tres catalogos como `error` y la
reconciliacion puede volver a encolar filas fallidas.

La baja fisica rompe la identidad entre SQLite y PostgreSQL y deja catalogos
obsoletos en dispositivos, porque la descarga actual hace UPSERT de lo recibido
pero no oculta filas sincronizadas ausentes. La fuente de recuperacion del
incidente sera la copia SQLite del productor, sin borrar visitas, recetas ni
otras operaciones pendientes.

## Alcance

### Incluido

- Conservar en mobile el detalle de validacion devuelto por la API.
- Marcar ingredientes, fertilizantes y marcas con fallo permanente como
  `error`, sin reencolarlos automaticamente mientras exista `sync_failures`.
- Evitar que el wrapper transaccional sustituya el resultado original por
  `cannot commit/rollback - no transaction is active`.
- Persistir el `publicId` enviado por mobile al crear los tres catalogos para
  garantizar idempotencia real.
- Permitir corregir y reintentar un alta fallida usando SQLite como fuente.
- Permitir descartar explicitamente un alta local nunca confirmada por la API,
  eliminando solo su fila local, outbox y fallo durable en una transaccion.
- Impedir el descarte de un ingrediente local mientras una marca pendiente o
  fallida dependa de el.
- Implementar baja logica administrativa (`activo = false`) para catalogos ya
  sincronizados; no exponer borrado fisico como operacion normal.
- Ocultar en mobile las filas sincronizadas que ya no formen parte del catalogo
  activo descargado, preservando filas `pending` y `error`.
- Definir un procedimiento productivo con backup, inventario de referencias,
  verificacion y rollback, sin ejecutar automaticamente contra produccion.

### Excluido

- Borrar visitas, recetas o detalles historicos que contienen nombres de
  productos.
- Vaciar SQLite, `sync_outbox` o `sync_failures` de forma masiva.
- Desinstalar la aplicacion o limpiar sus datos como mecanismo de reparacion.
- Ejecutar SQL, deploy u OTA en produccion sin aprobacion humana separada.
- Agregar mantenimiento completo de estos catalogos al panel web.

## Requisitos

- RF-001: Un error HTTP de validacion debe conservar campo y mensaje de
  `error.details` en el fallo durable y mostrarlo al usuario.
- RF-002: Un fallo permanente de ingrediente, fertilizante o marca debe dejar
  la fila local en `error` y fuera de la outbox hasta una accion explicita.
- RF-003: La reconciliacion no debe reencolar una entidad que ya tenga un fallo
  durable para el mismo usuario, tipo e ID local.
- RF-004: Reintentar una correccion debe conservar `id`, `public_id` e identidad
  de propietario, limpiar el fallo anterior y crear una unica operacion.
- RF-005: La API debe guardar el `publicId` del cliente y devolver la misma fila
  ante reintentos equivalentes.
- RF-006: Descartar un alta sin `server_id` debe exigir confirmacion y no debe
  afectar visitas ni recetas historicas.
- RF-007: Una fila con `server_id` nunca se descarta localmente como sustituto de
  una baja remota; debe desactivarse con autorizacion `ADMIN`.
- RF-008: La descarga debe ocultar catalogos sincronizados ausentes de la lista
  activa y volver a mostrarlos si reaparecen, sin tocar `pending` ni `error`.
- RF-009: Si una fila fue borrada manualmente del servidor pero mobile conserva
  su `publicId`, la recuperacion debe poder recrearla idempotentemente antes de
  desactivarla, solo mediante una accion explicita y auditada.
- RF-010: No se deben truncar silenciosamente nombres, concentraciones ni
  unidades para superar validaciones.
- RNF-001: La correccion debe ser compatible con versiones mobile instaladas;
  la API se despliega antes que la OTA.
- RNF-002: SQLite debe migrar hacia adelante preservando outbox, fallos, visitas
  y recetas.
- RNF-003: Toda mutacion de baja remota requiere autenticacion y rol `ADMIN`.
- RNF-004: Las operaciones deben ser idempotentes ante reinicio, timeout o
  perdida de respuesta.

## Contratos afectados

- API `POST /ingredientes-activos`, `POST /fertilizantes` y
  `POST /marcas-producto`: conserva `publicId` como clave idempotente.
- API: endpoint administrativo de baja logica para los tres catalogos; la
  respuesta conserva la identidad y expone el estado inactivo.
- SQLite: marca de visibilidad para `ingredientes_activos`, `fertilizantes` y
  `marcas_producto`, agregada mediante migracion preservadora.
- Sync: formato visible de errores, barrera de `sync_failures`, correccion,
  descarte local y reconciliacion de identidad.
- No cambia el payload historico de recetas, que conserva nombres.

## Seguridad y datos

- La baja logica remota es exclusiva de `ADMIN`; un agronomo solo puede
  corregir o descartar su alta local no confirmada.
- Antes de desactivar se consultan referencias y se conserva el historial.
- No se registran tokens, datos personales ni payloads completos en logs.
- Los ocho IDs locales del incidente no se incorporan a documentacion ni a
  scripts versionados.
- Un hard delete queda reservado a mantenimiento excepcional posterior al
  periodo de retencion y requiere otra aprobacion con backup verificado.

## Migracion y rollback

1. Crear backup productivo y verificar que sea restaurable.
2. Desplegar primero la API compatible e idempotente.
3. Verificar health, autenticacion, alta repetida por `publicId` y baja logica.
4. Publicar la OTA mobile con migracion SQLite preservadora.
5. En el dispositivo afectado, inspeccionar cada fallo y elegir:
   - corregir y reintentar si el dato debe conservarse;
   - descartar si nunca fue confirmado y era un error;
   - reconciliar por `publicId` y desactivar si ya existio remotamente.
6. Refrescar catalogos y verificar que los inactivos no sean seleccionables.

Rollback operativo: mantener columnas y datos aditivos; revertir el codigo API
y la OTA solo a versiones compatibles. No revertir SQLite borrando tablas. Si
una desactivacion fue incorrecta, reactivar la misma fila para conservar su ID y
`publicId`. Restaurar un backup completo solo ante corrupcion confirmada y con
aprobacion del responsable productivo.

## Criterios de aceptacion

- [x] CA-001: Un 400 de validacion muestra el campo y mensaje concretos.
- [x] CA-002: Un fertilizante con fallo permanente queda `error` y no reaparece
      en outbox durante ciclos automaticos.
- [x] CA-003: Corregir y reintentar conserva identidad y crea como maximo una
      fila remota.
- [x] CA-004: Una respuesta perdida seguida de reintento devuelve la fila del
      mismo `publicId` sin duplicarla.
- [x] CA-005: Descartar un alta no confirmada elimina solo el agregado local de
      catalogo y sus metadatos de sync.
- [x] CA-006: No se puede descartar un ingrediente requerido por una marca
      pendiente o fallida.
- [x] CA-007: Un `ADMIN` desactiva una fila sincronizada y un `AGRONOMO` recibe
      403 al intentar la misma operacion.
- [x] CA-008: Refrescar catalogos oculta inactivos, conserva pendientes y no
      altera recetas ni visitas.
- [x] CA-009: Ningun callback sin transaccion activa queda sustituido por un
      error secundario de commit o rollback.
- [ ] CA-010: La base SQLite productiva representativa migra sin perder los ocho
      fallos ni otras operaciones pendientes.

## Pruebas

- unitarias de DTO, idempotencia y autorizacion API;
- integracion de alta repetida y baja logica;
- unitarias de clasificacion/formato de errores y transaccion segura;
- sync offline-online para exito, validacion, reinicio y reintento;
- migracion SQLite con outbox y `sync_failures` poblados;
- descarte con y sin dependencia de marca;
- descarga que oculta inactivos y conserva pendientes;
- prueba manual de actualizacion in-place sobre el APK productivo anterior;
- gates focalizados de API/mobile y `pnpm db:smoke` antes de release.

## Impacto documental

- [x] Arquitectura: reconciliacion y visibilidad de catalogos editables.
- [x] Dominio: politica de baja logica de catalogos de receta.
- [x] Runbook: reparacion productiva y baja segura.
- [x] ADR: no corresponde; aplica patrones existentes de idempotencia y baja
      logica.
- [x] Variables o despliegue: API antes que OTA; sin secretos nuevos.
