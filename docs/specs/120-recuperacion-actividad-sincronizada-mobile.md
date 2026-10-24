---
title: Recuperacion de actividad sincronizada en un dispositivo mobile nuevo
status: implemented
numero: 120
area: mobile, api, sincronizacion, seguridad
created: 2026-10-24
approved_by: usuario solicitante (aprobación en conversación, 2026-10-24)
implemented_in: apps/api/src/modules/mobile-recovery/; apps/mobile/src/modules/recovery/; apps/mobile/src/modules/home/presentation/screens/home-screen.tsx
---

# Spec 120: Recuperacion de actividad sincronizada en un dispositivo mobile nuevo

## Contexto

El historial mobile se consulta desde SQLite local. La API conserva visitas y
transacciones sincronizadas, pero el cliente no tiene un flujo para reconstruir
en otro dispositivo los agregados con todos sus detalles. Las listas actuales
de visitas no incluyen por si solas todos los hijos ni las recetas completas.

Se requiere recuperar desde la cuenta autenticada la actividad de los ultimos
30 dias para que un usuario pueda continuar su trabajo sin el dispositivo
anterior. Solo son recuperables los datos confirmados en el servidor; trabajo
que nunca se sincronizo no sale del dispositivo de origen.

## Alcance

### Incluido

- Recuperar visitas tecnicas, visitas comerciales, pagos de cosecha, registros
  de cosecha y acreedores necesarios para esos registros, atribuidos al usuario
  autenticado.
- Incluir agregados completos de visita y dependencias necesarias para
  materializarlos en SQLite.
- Ofrecer un asistente al primer acceso autenticado y una accion permanente en
  Inicio para iniciar o reintentar la recuperacion.
- No descargar fotos ni metadatos de evidencia fotografica.

### Excluido

- Exportacion o importacion de archivos locales.
- Operaciones pendientes/error que nunca llegaron al servidor.
- Datos anteriores al periodo, datos de otros usuarios, fotos, borradores,
  caches climaticas y restauracion de secretos o sesiones.
- Modificar o eliminar registros del servidor.

## Requisitos

- RF-001: La API expone `GET /mobile/recuperacion`; requiere una sesion valida y
  deriva el usuario exclusivamente del JWT. No acepta un ID de usuario elegido
  por el cliente.
- RF-002: El periodo contiene hoy y los 29 dias calendario anteriores en
  `America/Lima`. Visitas tecnicas y comerciales se filtran por `fecha_visita`,
  registros de cosecha por `fecha_registro` y pagos por `creado_at`.
- RF-003: La recuperacion incluye solo visitas tecnicas y comerciales activas.
  Pagos y cosechas se limitan a los registros cuyo `creado_por_usuario_id`
  corresponde al usuario autenticado.
- RF-004: Una visita tecnica se entrega con cabecera, etapas, evaluaciones,
  observaciones sanitarias, notas, riego, labores, calificaciones y receta
  completa con mezclas y productos. Una visita comercial se entrega sin fotos.
  Pagos/cosecha incluyen acreedor y referencias necesarias para sus relaciones.
- RF-005: La respuesta se pagina en lotes de hasta 50 agregados completos. La
  primera pagina incluye ventana, conteos por tipo y marca temporal de snapshot;
  cada pagina incluye `nextCursor` opaco. El cursor queda vinculado en servidor
  al usuario, ventana y snapshot, con orden estable por tipo, fecha del evento e
  ID remoto.
- RF-006: El cliente refresca primero los catalogos disponibles y resuelve
  referencias remotas mediante `server_id`/`public_id`. Si falta una referencia
  necesaria, no confirma la pagina ni avanza su cursor; muestra que la
  recuperacion requiere reintento.
- RF-007: Mobile importa cada pagina en una transaccion SQLite y conserva el
  cursor solo despues del commit. Un cierre o error vuelve a procesar la misma
  pagina sin crear duplicados.
- RF-008: Los registros importados quedan con identidad remota y
  `sync_status = 'synced'`; la recuperacion no crea entradas en `sync_outbox` ni
  modifica estados remotos.
- RF-009: Si el agregado local equivalente tiene una operacion o entidad
  `pending`/`error`, outbox, fallo durable o borrador, se conserva el agregado
  local completo y no se sobrescribe con la copia remota.
- RF-010: El asistente aparece una vez por cuenta/dispositivo despues del
  primer inicio de sesion; permite iniciar o posponer. Inicio siempre ofrece
  `Recuperar ultimos 30 dias`. La interfaz muestra conteos, progreso y resultado
  parcial/completo.
- RF-011: Si el equipo esta offline, la app conserva el estado local, no marca
  la restauracion como completa y permite reintentar al volver a conectarse.
- RNF-001: Las respuestas son privadas y no-cacheables; no se registran tokens,
  payloads, nombres, documentos, cuentas ni ubicaciones en logs.
- RNF-002: La operacion es idempotente, reanudable y mantiene orden padre-hijos.
- RNF-003: Datos no sincronizados en el dispositivo anterior no se presentan
  como recuperables mediante esta funcion.

## Contratos afectados

- API: nuevo `GET /mobile/recuperacion?cursor=<opaco>` autenticado. Cada pagina
  responde con ventana de fechas, conteos, snapshot, registros tipados como
  agregados y cursor siguiente o `null`.
- Mobile: servicio de recuperacion, estado de avance por cuenta en `app_meta`,
  upserts por identidad remota y asistente/accion en Inicio.
- No se cambian endpoints de escritura, payloads de sync existentes ni contratos
  de API para panel web.

## Seguridad y datos

- Para visitas, el backend filtra por `agronomo_usuario_id` del usuario
  autenticado; para pagos y cosecha, por `creado_por_usuario_id`. Ningun filtro
  de propietario proviene de parametros del cliente.
- El cursor no permite cambiar usuario, ventana o snapshot; una solicitud con
  cursor ajeno/invalido se rechaza sin devolver datos.
- Los registros que ya existan en SQLite con trabajo local no confirmado se
  conservan sin combinar payloads potencialmente conflictivos.
- No se recuperan binarios ni referencias de fotos comerciales.

## Migracion y rollback

- API: endpoint aditivo, sin cambio de PostgreSQL; se usan atribuciones y datos
  existentes.
- SQLite: sin cambio estructural; el avance por usuario/cuenta se persiste en
  `app_meta` y las tablas existentes reciben registros sincronizados.
- Despliegue: publicar primero la API y luego mobile. Si la API no esta
  disponible, la nueva accion informa que puede reintentarse y no modifica
  datos locales.
- Rollback: retirar la accion/cliente detiene nuevas recuperaciones. Las filas
  ya importadas siguen siendo copias sincronizadas locales y no se eliminan.

## Criterios de aceptacion

- [ ] CA-001: Un usuario recupera solo su actividad sincronizada del periodo de
  30 dias en hora de Lima; un segundo usuario no puede consultar esos datos.
- [ ] CA-002: Visitas tecnicas completas, incluidas recetas y detalles, quedan
  disponibles offline despues de la recuperacion.
- [ ] CA-003: Visitas comerciales, pagos, cosecha y acreedores vinculados se
  restauran por atribucion del servidor; no se descargan fotos.
- [ ] CA-004: Paginar hasta el final no omite ni duplica agregados; cursor de
  otra cuenta o snapshot es rechazado.
- [ ] CA-005: Repetir una pagina o reiniciar la app no duplica datos; cursor
  avanza solo despues de commit.
- [ ] CA-006: Operaciones, fallos o borradores locales no se sobrescriben.
- [ ] CA-007: Offline, error de API o referencia ausente deja recuperacion
  reintentable y no marca exito.
- [ ] CA-008: El asistente inicial y la accion en Inicio muestran progreso y
  permiten completar o reintentar sin bloquear el trabajo local.
- [ ] CA-009: Una actividad nunca sincronizada no aparece como recuperada.

## Pruebas

- API unitarias/integracion: periodo Lima, atribucion por tipo, cursor,
  paginacion, snapshot, cursor manipulado/ajeno y respuestas no-cacheables.
- Mobile con SQLite real: orden padre-hijos, IDs remotos, upsert repetido,
  rollback de pagina, resume tras cierre y conflicto con estado local pendiente.
- Offline-online: primer acceso sin red, recuperacion posterior, cursor parcial,
  catalogo/dependencia ausente y reintento.
- Mobile UI: asistente por cuenta, posponer, accion en Inicio, progreso, cero
  registros y errores recuperables.
- Seguridad: dos cuentas de prueba con registros de todos los tipos; comprobar
  que cada respuesta solo contenga datos atribuibles a su JWT.

## Impacto documental

- [x] Arquitectura offline mobile y recuperacion entre dispositivos.
- [x] Documentacion de API/autorizacion (contrato documentado en arquitectura y Swagger).
- [ ] Modelo de dominio (sin cambio de esquema ni reglas del dominio).
- [x] Runbook de soporte y recuperacion.
- [ ] Registro de riesgos (riesgos de alcance documentados en este runbook y spec; no se agrega riesgo operativo independiente).
