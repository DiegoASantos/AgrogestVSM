---
title: Fotos comerciales independientes por productor
status: implemented
numero: 102
area: mobile, api, admin-web, database, sync, seguridad, operacion
created: 2026-10-13
approved_by: usuario mediante instrucción "implementa la spec", 2026-10-13
implemented_in: API comercial y migración 069; mobile Comercial, SQLite 77 y outbox; admin-web Mantenimiento/Acreedores; docker-compose y runbooks (2026-10-13)
---

# Spec 102: Fotos comerciales independientes por productor

## Contexto

Comercial mobile permite que el agrónomo registre los datos de un acreedor o
comparta un acceso para que el productor los registre. Se requiere una tercera
opción: adjuntar una o varias fotos de documentos personales o bancarios de un
productor para consulta posterior en Mantenimiento > Acreedores. Las fotos no
constituyen un registro de acreedor ni completan sus campos. La eventual captura
manual de esos datos desde las fotos en la web será otro cambio.

El panel ya dispone de `/mantenimiento/acreedores-cosecha`, pero su listado parte
de los acreedores registrados. Debe mostrar también productores que solo tengan
fotos. Mobile funciona sin conexión; la API y el panel operan en un servidor
Ubuntu con Docker Compose. La comunicación pública actual usa HTTP y el usuario
decidió conservarlo con conocimiento del riesgo para estas fotos.

## Alcance

### Incluido

- Tercera acción independiente `Adjuntar fotos` en Comercial mobile, luego de
  seleccionar un productor visible para el agrónomo.
- Tomar fotos con la cámara o seleccionar varias de la galería, revisar su
  legibilidad y guardarlas localmente si no hay conexión.
- Sincronización individual, durable e idempotente de cada foto, con estado
  visible `pendiente`, `subida` o `error` y reintento de fallos.
- Almacenamiento privado y persistente en el servidor propio, con metadatos en
  PostgreSQL y volumen de archivos fuera del directorio público.
- Consulta autenticada de las fotos por `ADMIN` y `ANALISTA` en una vista por
  productor dentro del mantenimiento existente, aun sin acreedor registrado.
- Procedimiento para respaldar y restaurar conjuntamente metadatos, archivos y
  claves de cifrado. La contratación/configuración del destino de nube y la
  operación de las copias externas corresponden al usuario.
- Registro explícito del riesgo de transmisión por HTTP aceptado por el usuario.

### Excluido

- Crear, aprobar, editar o completar acreedores a partir de las fotos.
- OCR, lectura automática de documentos, clasificación obligatoria y validación
  de la veracidad de datos bancarios.
- Carga de fotos mediante el enlace público del productor o desde el panel web.
- Descargar, compartir o eliminar fotos desde la web en esta entrega.
- Eliminación automática por antigüedad. Los originales de fotos elegidas desde
  la galería permanecen bajo control de la galería/dispositivo.
- Provisionar un servicio de nube, comprar certificados o migrar el tráfico
  público de HTTP a HTTPS como parte de esta funcionalidad.

## Requisitos

- RF-001: solo `AGRONOMO` puede agregar fotos desde su sesión mobile a un
  productor que la API autorice para ese usuario. El productor puede no tener
  acreedores. La acción no exige crear uno, no modifica sus datos y no afecta la
  aprobación ni el registro de cosecha.
- RF-002: se pueden tomar fotos con cámara y seleccionar una o varias imágenes
  de la galería. La app muestra una vista previa y permite retirar una selección
  antes de guardarla. No agrega deliberadamente las fotos tomadas a la galería.
- RF-003: cada foto se copia al almacenamiento persistente y privado de la app,
  ligado al usuario de la sesión. La base local guarda solo identidad, productor,
  ruta interna, hash, tamaño, estado y fechas; nunca el binario ni base64 en
  SQLite u outbox. Una foto `pendiente` sigue disponible tras cerrar o reiniciar
  la app y se advierte que todavía no cuenta con respaldo del servidor.
- RF-004: cada foto tiene UUID público estable, una operación de outbox y un
  intento de carga independiente. Si el productor aún no tiene ID remoto, el
  handler espera la sincronización del padre. La falta de red, expiración de
  sesión, error de una foto o cierre de la app no descarta las otras. La app
  conserva los pendientes de su propietario al cambiar de sesión.
- RF-005: la API responde idempotentemente a un reintento con el mismo UUID,
  productor y contenido. Si el UUID ya corresponde a otro productor o contenido,
  responde conflicto sin sustituir el archivo. Mobile marca `subida` y retira
  su copia local únicamente después de confirmar identidad y persistencia
  remotas; si el archivo local falta antes de sincronizar, muestra error
  recuperable y no declara éxito.
- RF-006: la app normaliza las fotos elegidas a JPEG antes de guardarlas; si no
  puede decodificar una selección, informa el error sin crear un pendiente. El
  servidor acepta una imagen JPEG por solicitud, con máximo inicial de 10 MiB.
  Rechaza archivos dañados, tipos simulados
  y dimensiones excesivas. Normaliza a un formato de imagen común preservando
  legibilidad y retirando metadatos como EXIF/GPS antes de almacenar. Los límites
  finales de dimensiones/calidad se verifican con fotos sintéticas de texto
  pequeño antes de liberar la función.
- RF-007: los archivos se guardan en un volumen persistente montado solo en la
  API, fuera de rutas estáticas y de Git, con nombres opacos. PostgreSQL conserva
  un registro por foto con UUID, productor, autor, fecha, clave interna de
  almacenamiento, tipo, tamaño, hash de entrada, hash almacenado y versión de
  cifrado; no conserva DNI, cuenta ni descripción textual extraída de la imagen.
- RF-008: la web muestra una pestaña `Fotos por productor` en
  `/mantenimiento/acreedores-cosecha`, con búsqueda/paginación por productor,
  cantidad de fotos, fecha de carga y visor a demanda. Incluye productores sin
  acreedores. No ofrece edición ni eliminación. Al abrir una imagen, la API
  comprueba de nuevo autenticación y rol `ADMIN` o `ANALISTA` y registra el
  acceso sin copiar el contenido en logs.
- RF-009: los archivos subidos se conservan sin vencimiento ni borrado
  automático en esta versión, incluso si se desactiva el productor. Una futura
  política de eliminación requerirá especificar el efecto en copias de respaldo
  y auditoría mediante otra spec.

- RNF-001: la carga multipart se procesa como flujo con límites de tamaño,
  cantidad y tiempo; nunca se acumula sin límite en memoria. La validación
  comprueba el contenido real además de extensión/MIME declarados. Un archivo
  temporal o huérfano se limpia de forma controlada tras error o reinicio.
- RNF-002: los archivos pendientes se protegen en el espacio privado del
  dispositivo y se cifran antes de persistirse; una clave pequeña, separada por
  usuario, se protege mediante el almacén seguro del sistema. Se eliminan las
  copias temporales de la app cuando deja de necesitarlas. La app no puede
  borrar el original que el usuario ya tenía en su galería.
- RNF-003: los archivos del servidor se cifran en reposo; la clave no se guarda
  junto al volumen, en PostgreSQL, Git ni logs. El procedimiento de recuperación
  contempla una copia protegida de la clave y su versión. El volumen tiene
  permisos mínimos para el proceso API y no se publica por el proxy web.
- RNF-004: las respuestas de listado/contenido usan `Cache-Control: no-store`;
  el contenido usa `X-Content-Type-Options: nosniff` y se entrega solo mediante
  un endpoint autenticado. La web no persiste imágenes en `localStorage`,
  IndexedDB ni caché de servicio. No hay URL pública ni descarga directa desde
  el volumen.
- RNF-005: nombre original, bytes, token, DNI y cuenta no aparecen en rutas,
  errores, logs, trazas ni eventos de analítica. La auditoría contiene actor,
  foto, productor, acción y fecha. Límites de carga y de consulta protegen
  almacenamiento y disponibilidad.
- RNF-006: HTTP público sigue sin cifrar imágenes, cookies o tokens y permite
  interceptación o alteración del tránsito. El cifrado local, del servidor y del
  respaldo no mitiga ese trayecto. Este riesgo aceptado se mostrará en la
  documentación operativa y no se describirá la solución como segura en tránsito.
- RNF-007: la copia externa cifra tanto archivos como dump de PostgreSQL. Cada
  ejecución registra resultado, manifiesto de hashes y cobertura; una prueba de
  restauración verifica que registros y archivos coincidan. El repositorio
  entrega el procedimiento y comprobaciones locales; el usuario opera y verifica
  la programación y el destino de nube antes de usar datos reales.

## Contratos afectados

- **Mobile/SQLite:** tabla aditiva `fotos_comerciales_productor` con ID local,
  UUID, `productor_id` local, `owner_user_id`, ruta privada, hash, tamaño,
  `server_id`, estado y fechas; índice por propietario/productor/estado. Nuevo
  tipo `fotos_comerciales_productor` en `sync_outbox` y handler después del
  productor. La ruta es local y nunca viaja como valor del contrato API.
- **API:** `POST /comercial/productores/:productorId/fotos` multipart con UUID
  idempotente en `X-Photo-Id` y archivo JPEG, rol `AGRONOMO` y autorización
  horizontal del productor.
  `GET /comercial/mantenimiento/productores-con-fotos` devuelve un listado
  paginado de productores con fotos; `GET
  /comercial/mantenimiento/productores/:productorId/fotos` devuelve metadatos
  paginados;
  `GET /comercial/mantenimiento/fotos/:publicId/contenido` entrega una imagen,
  siempre con roles `ADMIN` o `ANALISTA`. Ninguna respuesta entrega la clave del
  volumen ni una ruta de archivo. No se amplían las rutas del productor público.
- **PostgreSQL:** tabla nueva `fotos_comerciales_productor` con FK a
  `productores` y `usuarios`, UUID único, clave de almacenamiento única,
  metadatos de integridad/cifrado, timestamps e índices por productor/fecha. La
  FK impide borrar físicamente un productor con fotos; la baja lógica conserva
  acceso administrativo. Sin cambios a `acreedores_cosecha` ni pagos.
- **Web:** ampliar la ruta de mantenimiento y sus servicios de lectura sin
  crear otro catálogo de acreedores. El listado de productores con fotos no
  depende de una unión interna con `acreedores_cosecha`.
- **Infraestructura:** volumen Docker privado y persistente para la API,
  ubicación configurable sin valores secretos en Git, límite de espacio/alerta,
  procedimiento de respaldo y restauración del volumen y PostgreSQL.

## Seguridad y datos

Activos: imágenes de documentos y cuentas, copias pendientes mobile, metadatos,
claves de cifrado y respaldos. La API es la única vía de lectura/escritura del
volumen. `AGRONOMO` solo sube para productores autorizados; `ADMIN` y
`ANALISTA` solo consultan en esta entrega. La UI nunca sustituye guards ni la
verificación de pertenencia. El visor no reutiliza la invitación pública del
productor. Todo acceso y rechazo relevante se audita sin contenido sensible.

El usuario decidió mantener HTTP público. Por ello las fotos y credenciales
pueden ser leídas o modificadas por un tercero con acceso al trayecto de red,
aun cuando el archivo se cifre en el dispositivo o servidor. Se registra como
riesgo alto aceptado; no hay compensación equivalente a cifrar la conexión.
La eventual adopción de HTTPS o túnel cifrado requiere una decisión posterior.

## Migración y rollback

1. Preparar volumen privado, permisos, clave de cifrado y procedimiento de
   backup/restore con datos sintéticos. Confirmar espacio y una restauración de
   prueba; el respaldo de PostgreSQL existente no incluye el nuevo volumen.
2. Añadir migración PostgreSQL y desplegar API compatible con mobile actual.
   Mantener `synchronize: false`; probar bootstrap vacío y actualización de una
   base representativa. La API antigua ignora la tabla nueva.
3. Desplegar web de consulta y comprobar que un productor sin acreedor aparece
   en la pestaña de fotos. Los perfiles existentes no cambian.
4. Publicar mobile con migración SQLite aditiva, archivos privados y handler.
   Una OTA/APK anterior mantiene sus datos y outbox; la nueva app no inicia la
   carga hasta encontrar API compatible. Probar actualización con pendientes
   previos y productor aún sin ID remoto.
5. El usuario configura y confirma copia cifrada fuera del servidor y ejecuta
   una restauración de archivos, metadatos y clave antes de usar fotos reales.

Si se revierte la UI o API, se deshabilitan nuevas cargas y se conservan tabla,
volumen y claves. Los pendientes mobile permanecen para reintento al restaurar
la API compatible. No ejecutar `down` que borre imágenes o metadatos. Un
rollback de datos se realiza desde una copia coordinada; un reconciliador detecta
archivos huérfanos y registros cuyo archivo falte sin declarar cargas exitosas.

## Criterios de aceptación

- [ ] CA-001: el agrónomo adjunta una o varias fotos al productor sin registrar
      acreedor ni modificar su estado.
- [ ] CA-002: cámara, galería, vista previa y retirada antes de guardar
      funcionan; el original elegido de la galería no se altera.
- [ ] CA-003: sin red y tras reinicio, las fotos conservan propietario y estado;
      una falla de otra foto no impide los demás envíos.
- [ ] CA-004: un productor creado offline se sincroniza antes de sus fotos;
      reintentar el mismo UUID no duplica ni sustituye imágenes.
- [ ] CA-005: archivos falsos, dañados, sobredimensionados o de productor ajeno
      se rechazan; no queda un temporal legible ni un registro confirmado falso.
- [ ] CA-006: `ADMIN` y `ANALISTA` ven en Mantenimiento los productores con
      fotos aunque no existan acreedores; otros roles y la sesión pública del
      productor no pueden verlas.
- [ ] CA-007: volumen, claves y copias están fuera de Git y de rutas públicas;
      el respaldo y una restauración sintética verifican integridad y acceso.
- [ ] CA-008: el riesgo de HTTP y la ausencia de eliminación automática quedan
      documentados sin presentar los controles de reposo como cifrado del tránsito.

## Pruebas

- Unitarias: validación de imagen, permisos/propiedad, idempotencia y conflicto
  por UUID, estados de outbox, limpieza y reconciliación.
- Integración: migraciones PostgreSQL/SQLite, streaming multipart, archivo
  temporal/cifrado, `no-store`, guards, búsqueda de productor sin acreedor y
  contenido servido solo con sesión permitida.
- Offline-online: cámara y galería, interrupción a mitad de carga, reinicio,
  productor padre pendiente, cambio de usuario, pérdida del archivo local,
  reintento y confirmación individual.
- Manual/E2E: lectura de texto pequeño tras normalizar, denegación a roles
  ajenos, ausencia de fotos en logs/cachés públicas, volumen tras reconstruir
  contenedor y restauración de conjunto archivo/BD/clave con datos sintéticos.
- Gates: lint, tipos, pruebas y build de API, mobile y admin-web; revisión de
  seguridad y simulacro de backup/restore antes de liberar.

## Impacto documental

- [x] Arquitectura mobile offline y almacenamiento de archivos.
- [x] Modelo de datos de fotos por productor.
- [x] Runbook de backup/restore y despliegue del volumen.
- [x] Línea base de seguridad y registro de riesgo HTTP aceptado.
- [x] Variables de ruta, clave, tamaño máximo y monitoreo de almacenamiento.

## Estado de validación

La implementación local pasó tipos, lint, builds, validación documental y la
suite Vitest completa. La prueba en un dispositivo Android con
cámara/galería, la migración y restauración con PostgreSQL real, la generación
del APK y la configuración/verificación del backup externo requieren la ventana
de puesta en servicio. No se han operado datos ni servidores de producción.
