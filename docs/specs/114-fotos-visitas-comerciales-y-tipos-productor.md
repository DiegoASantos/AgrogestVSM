---
title: Fotos de visitas comerciales y tipos de productor
status: draft
numero: 114
area: mobile, api, admin-web, database, sync, seguridad
created: 2026-10-19
approved_by:
implemented_in:
---

# Spec 114: Fotos de visitas comerciales y tipos de productor

## Contexto

El usuario solicita adjuntar imágenes dentro del formulario de visita comercial
que contiene tipo de productor, nombre y descripción, con una experiencia similar
a las fotos de Comercial > Acreedores. También solicita mostrar Asociación en
lugar de Asociativa y agregar Cooperativa. Se actualizó `produccion` mediante
fast-forward de `0e52592` a `09aa3b2`, sin cambios locales previos.

El usuario confirmó que las fotos deben consultarse en la app y en el detalle
web, sin incorporarlas al PDF ni al Excel. La visita comercial es independiente
de los productores registrados: las fotos se vinculan a su propia visita, sin
crear productores ni reutilizar la relación de fotos por productor.

## Alcance

### Incluido

- Selección opcional de fotos de cámara o galería en el formulario de alta de
  visita comercial de Android y iPhone, con vista previa y descarte antes de guardar.
- Persistencia cifrada offline, sincronización recuperable y consulta de fotos
  en el detalle de esa visita en mobile y web.
- Etiqueta Asociación y nueva opción Cooperativa en las visitas comerciales,
  incluyendo su representación textual en historial, detalle, PDF y Excel.
- Migraciones PostgreSQL/SQLite, contratos autenticados, autorización, pruebas
  y documentación de operación y recuperación.

### Excluido

- Fotos dentro de PDF o Excel; cambios a visitas técnicas o fotos de acreedores.
- Alta automática de productores, OCR, enlaces públicos, carga desde web,
  edición o eliminación de fotos ya guardadas y adjuntar fotos a visitas antiguas.
- Operar la base de producción, desplegar, publicar OTA, generar instalables,
  hacer commit o push sin la autorización correspondiente.

## Requisitos

- RF-001: El formulario ofrece tomar foto y elegir imágenes. La galería permite
  hasta diez imágenes por selección, igual al flujo de referencia. Antes de
  guardar se pueden ver y quitar imágenes seleccionadas. Las fotos son opcionales.
- RF-002: Persona y Recorredor conservan nombres y apellidos; Fundo, Asociación
  y Cooperativa usan solo nombre. Se mantiene el código persistido `ASOCIATIVA`
  para mostrar Asociación, sin reescribir visitas históricas ni payloads pendientes.
  La nueva opción usa `COOPERATIVA`. Los tipos de otros módulos no cambian.
- RF-003: Cada imagen se normaliza a JPEG, calidad 90 y lado máximo 3000 px,
  sin EXIF; su tamaño normalizado debe ser de 1 byte a 10 MiB. Un error de
  permisos, decodificación o almacenamiento se informa y conserva el formulario.
- RF-004: Al guardar, primero se preparan archivos cifrados duraderos y luego se
  confirman en una sola transacción SQLite la visita, sus fotos y sus operaciones
  outbox. Un fallo antes del commit no deja una visita parcialmente guardada;
  se limpian los archivos creados por ese intento. No se borran fotos originales.
- RF-005: Las fotos usan UUID estables y pertenencia al usuario de la sesión.
  La sincronización confirma la visita antes de subir sus fotos individualmente;
  un padre pendiente o fallido impide subir hijos. Reintentos por desconexión,
  reinicio o respuesta perdida conservan los identificadores y no duplican datos.
- RF-006: El detalle mobile muestra fotos pendientes o fallidas desde el archivo
  local cifrado y permite reintentar el envío fallido. Tras confirmación remota y
  retiro de la outbox se puede limpiar la copia local, como en fotos por productor.
  La visualización de fotos sincronizadas consulta la API autenticada y requiere
  conexión; los errores de red son visibles y no bloquean el resto del detalle.
- RF-007: El detalle web de visita comercial permite listar y abrir sus imágenes,
  con paginación de veinte fotos. Muestra carga, ausencia de fotos y errores.
  Cambiar visita, cerrar el visor, desmontar o cerrar sesión invalida solicitudes
  anteriores y libera las URL de blobs correspondientes.
- RNF-001: SQLite guarda metadatos, nunca binarios. Archivos locales cifrados
  con AES-256-GCM y claves por usuario en SecureStore; temporales descifrados de
  vista previa o envío se eliminan al cerrar, fallar o terminar la operación.
- RNF-002: Cambiar de cuenta durante selección, preparación, vista previa o
  sincronización no permite confirmar archivos ni filas bajo el usuario nuevo,
  ni mostrar contenido de la cuenta anterior. No marcar fotos sincronizadas
  sin confirmación válida y comprobación de propietario.
- RNF-003: Reutilizar dependencias nativas y configuración de fotos existentes;
  mantener compatibilidad Android/iPhone y no modificar permisos o políticas
  ajenos a este flujo. La captura de GPS opcional y la fecha de Lima se conservan.

## Contratos afectados

### API

Extender `tipoSujeto` con `COOPERATIVA` en DTO, entidad y consumidores. Conservar
los otros códigos y la forma de creación y respuesta de visitas de la spec 109.

Endpoints nuevos, con `visitaId` y `fotoId` UUID v4 públicos:

| Método y ruta | Entrada | Respuesta |
|---|---|---|
| `POST /visitas-comerciales/:visitaId/fotos` | Multipart con un JPEG; cabecera `X-Photo-Id` UUID estable | Envelope con `id`, `publicId`, `createdAt` de la foto |
| `GET /visitas-comerciales/:visitaId/fotos` | `page` entero positivo; `limit` predeterminado 20, máximo 100 | Envelope de metadatos y paginación estándar |
| `GET /visitas-comerciales/:visitaId/fotos/:fotoId/contenido` | Token y relación visita/foto válidos | JPEG privado, `Cache-Control: no-store`, `nosniff` |

Documentar entradas y permisos con Swagger junto al controlador existente,
usando DTO validado para paginación. Respetar límites multipart existentes y
rechazar contenido inválido sin escribir metadatos. Una repetición de UUID con
la misma visita, autor y hash devuelve la misma foto; otro contenido o relación
devuelve conflicto. No confiar solo en extensión o MIME declarado: validar JPEG
y limitar decodificación a 36 millones de píxeles en servidor.

### PostgreSQL

Migración siguiente `074`: ampliar los CHECK de `visitas_comerciales` para
Cooperativa, incluido el CHECK inline creado por 073 y el constraint nombrado
`chk_visita_comercial_tipo`; ampliar la regla de apellidos para organizaciones.
No modificar las migraciones históricas para sustituir este avance.

Crear `fotos_visita_comercial` con identificador interno, UUID público único,
FK a visita, autor autenticado, clave de almacenamiento, hashes de entrada y
archivo cifrado, tamaño, MIME, nonce, tag, versión de clave y fecha. Indexar
visita/fecha/id para consulta paginada. Registrar lecturas en tabla de auditoría
propia vinculada a foto y usuario, sin guardar contenido ni datos descriptivos.

Los archivos usan el almacenamiento privado cifrado configurado para fotos
comerciales, en un subdirectorio separado. No se exponen por servidor estático.
Respaldar metadatos, volumen y clave según el runbook vigente; no asumir que
la existencia del volumen garantiza un backup operativo.

### SQLite y outbox

Migración siguiente `79`: ampliar el CHECK de tipos preservando todas las filas
y columnas de visitas, sus IDs, propietarios, fechas, errores y pendientes.
Si SQLite exige reconstruir la tabla, hacerlo transaccionalmente, copiar columnas
explícitas y recrear índices antes de crear relaciones de fotos. Mantener la
reparación idempotente de tabla comercial ausente aun con versión registrada 78.

Crear `fotos_visita_comercial` con IDs local/público/remoto, visita local, usuario,
ruta cifrada, hash, tamaño, fechas y estado/error de sincronización. Su outbox
usa tipo propio `fotos_visita_comercial`. Integrar orden padre-hijos, handlers,
aislamiento por cuenta, reintentos, estado y limpieza de archivos confirmados.
No borrar ni reescribir operaciones outbox existentes como parte de la migración.

## Seguridad y datos

- Escritura: AGRONOMO y ADMIN solo sobre visitas propias activas; el autor se
  obtiene del token. Lectura: AGRONOMO sobre sus visitas; ADMIN y ANALISTA sobre
  todas las visitas comerciales activas. ANALISTA no puede subir fotos.
- Comprobar relación foto/visita en el servidor para evitar acceso cruzado por
  UUID. No permitir descarga anónima ni incluir tokens en URL.
- No registrar imágenes, descripción, nombres, coordenadas, claves ni tokens
  en logs. No incluir datos reales en fixtures o documentación.
- Mantener la excepción HTTP del piloto ya aceptada en specs 103/113 y riesgo
  R-059; el cifrado en disco no protege el transporte HTTP. Este alcance no
  amplía acceso público ni configura una excepción adicional.
- Las consultas y escrituras nuevas usan parámetros; validar UUID antes de
  resolver archivos y no aceptar rutas o nombres de almacenamiento del cliente.

## Migración y rollback

1. Antes del despliegue, comprobar backup/restore de PostgreSQL, volumen y clave
   de fotos; ejecutar smoke de migración en un entorno local desechable.
2. Desplegar expansión de esquema y API antes de habilitar web/mobile. Clientes
   anteriores siguen enviando los cuatro códigos existentes y no usan las fotos.
3. Ejecutar migración SQLite al abrir la app. Probar instalación vacía, versión
   74 representativa del arranque reparado, versión 78 con visitas y outbox y
   versión 78 con tabla ausente. Reabrir no repite copias ni pierde pendientes.
4. No requiere módulos nativos nuevos. Una eventual OTA necesita verificar el
   runtime instalado y autorizarse aparte, con el backend ya compatible.
5. Ante fallo, desactivar el flujo nuevo con una corrección de app/web, manteniendo
   esquema y API compatibles con `COOPERATIVA` y las fotos ya recibidas. No
   degradar SQLite ni borrar visitas, fotos o pendientes. Preferir migración
   correctiva hacia adelante. Una restauración que reemplace datos requiere
   aprobación y evaluación de los registros creados después del backup.

## Criterios de aceptación

- [ ] CA-001: Asociación reemplaza la etiqueta Asociativa y Cooperativa se guarda
  con solo nombre; todos los tipos conservan sus reglas de validación.
- [ ] CA-002: Cámara/galería, vista previa y descarte funcionan en Android/iPhone;
  guardar sin imágenes conserva el flujo previo.
- [ ] CA-003: Varias fotos y su visita sobreviven al cierre offline; al recuperar
  red se envía primero el padre y cada foto se confirma una sola vez.
- [ ] CA-004: Fallos de preparación, transacción, red, proceso y cambio de cuenta
  no pierden pendientes ni cruzan propietarios; el reintento recupera errores.
- [ ] CA-005: Fotos visibles en el detalle mobile y web con permisos correctos;
  una foto sincronizada sin conexión muestra un error recuperable.
- [ ] CA-006: PDF y Excel conservan su estructura sin fotos y presentan las nuevas
  etiquetas de tipo; las visitas históricas Asociativa se muestran Asociación.
- [ ] CA-007: Migraciones preservan filas y outbox, aceptan Cooperativa y funcionan
  en instalación nueva, actualización y segunda apertura.
- [ ] CA-008: API rechaza lectura/escritura ajena, rol no autorizado, JPEG inválido,
  exceso de tamaño y reutilización conflictiva de UUID; reintento válido es idempotente.

## Pruebas

- API: DTO y CHECK de tipos, apellidos, paginación, guards y pertenencia;
  multipart inválido, límite, normalización, cifrado/integridad y acceso auditado;
  UUID repetido, concurrente y conflictivo. Verificar tipos en PDF/Excel.
- PostgreSQL/PostGIS local: migración 073 a 074 con filas sintéticas de los
  cuatro tipos, inserción de Cooperativa y prueba de restricciones/relaciones.
- SQLite real: esquema vacío y actualizaciones representativas, integridad de
  IDs/propietarios/estados/outbox, segunda apertura y rollback transaccional.
- Mobile: commit visita/fotos/outbox, limpieza en fallo, aislamiento de sesión,
  orden de sincronización, padre fallido, reintento y confirmación con limpieza.
- Web: cliente autenticado de listado/contenido, etiquetas y ciclo del visor
  al cambiar de visita, cerrar sesión o recibir respuestas tardías.
- Lint, tipos, pruebas afectadas, validación documental y builds de API/web;
  exportaciones Expo iOS/Android para comprobar dependencias de ambas plataformas.
- Validación física antes de distribución: cámara/galería iPhone y Android,
  varias fotos offline, reiniciar, sincronizar, revisar en web y volver a abrir.
  Registrar limitaciones reales de las verificaciones disponibles.

## Impacto documental

- [ ] Arquitectura: flujo de fotos por visita en `architecture/mobile-offline-sync.md`.
- [ ] Dominio: tipos, relaciones y reglas en `domain/data-model.md`.
- [ ] Runbook: almacenamiento, backup y orden de despliegue en documentos vigentes.
- [ ] Índices: enlazar esta spec desde el índice general y el de especificaciones.
- [ ] Riesgos: registrar verificaciones operativas o físicas pendientes al cerrar.
- [ ] ADR: no se requiere; se extienden patrones existentes de specs 103 y 109.

## Aprobación

El 2026-10-19 el usuario autorizó por separado «Mejorar acreedores y preparar el
visor para visitas», limitado a presentación web. El componente compartido
`apps/admin-web/src/shared/components/photo-gallery.tsx` se integra con el lector
autenticado de acreedores y queda disponible para la futura consulta de fotos
por visita. Esta mejora visual no habilita endpoints, tablas ni sincronización
de fotos de visitas y no cambia el estado de aprobación de esta spec.

Pendiente de aprobación humana. La confirmación de dónde ver las fotos define
el alcance, pero no sustituye la aprobación de esta spec para cambios de DB,
sync, seguridad y contratos entre aplicaciones.
