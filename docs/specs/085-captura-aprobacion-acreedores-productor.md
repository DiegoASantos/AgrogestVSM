---
title: Captura y aprobación de acreedores por productor
status: implemented
numero: 085
area: comercial, api, admin-web, mobile, database, sync, seguridad
created: 2026-10-02
approved_by: usuario
implemented_in: apps/api/src/modules/comercial; apps/api/src/database/migrations/064-acceso-productor-y-revision-acreedores.ts; apps/admin-web/src/app/productor/acreedores; apps/admin-web/src/app/(admin)/comercial; apps/mobile/src/modules/comercial; apps/mobile/src/shared/database/migrations.ts; apps/mobile/src/shared/sync/sync-handlers.ts
---

# Spec 085: Captura y aprobación de acreedores por productor

## Contexto

Comercial tiene dos formularios mobile: el primero registra perfiles de
acreedores y el segundo registra cosechas. Actualmente ambos requieren una
sesión `ADMIN` o `AGRONOMO`; los acreedores se pueden usar inmediatamente y no
tienen edición ni revisión. Se necesita que el productor sea la fuente
principal de los datos bancarios, conservar el formulario mobile como
alternativa del agrónomo y someter los perfiles nuevos a aprobación del
analista antes de usarlos en cosecha.

El productor accederá a un formulario web móvil mediante un enlace y un código
de acceso compartidos desde Comercial mobile. El mismo acceso permitirá
consultar observaciones y reenviar correcciones. El productor no tendrá acceso
al registro de cosecha.

## Alcance

### Incluido

- Generar desde Comercial mobile un acceso asociado a un productor visible para
  el usuario y compartir enlace más código mediante la hoja nativa del
  dispositivo, que permite elegir WhatsApp.
- Formulario web público y adaptable a celular, fuera del layout autenticado,
  que requiere el código, identifica al productor sin pedirle seleccionarlo y
  registra uno o más perfiles con los campos de `HarvestCreditorInput`.
- Consulta de estado y observaciones, edición de perfiles observados y
  reenvío para revisión usando el mismo acceso vigente.
- Revisión en el panel web por `ANALISTA` o `ADMIN`: consulta de datos completos,
  origen del registro, estado, aprobación u observación obligatoria.
- Acceso al segundo formulario mobile únicamente con acreedores aprobados.
- Estados, procedencia y auditoría de revisión en API y PostgreSQL; estado y
  procedencia en SQLite para conservar la experiencia offline-first.
- Migrar perfiles existentes como aprobados y mantener sin cambios los
  registros históricos y sus instantáneas.

### Excluido

- Registro de cosecha, precio o jabas desde la web pública.
- Cuenta o contraseña de productor, integración de envío automático con
  WhatsApp/SMS/correo y uso de Google Forms.
- Edición de acreedores por usuarios mobile; el formulario actual sigue
  creando perfiles como alternativa. El productor corrige desde la web los
  perfiles observados.
- Desactivar o borrar acreedores y modificar las instantáneas de registros de
  cosecha ya creados.

## Requisitos

- RF-001: `ADMIN` o `AGRONOMO` puede generar un acceso únicamente para un
  productor que la API autorice para esa sesión. La operación requiere
  conexión.
- RF-002: el código es aleatorio, no contiene DNI ni identificadores del
  productor, tiene vigencia de 180 días desde su emisión y se almacena como
  hash. Solo hay un código vigente por productor; emitir otro revoca el
  anterior. El mensaje compartido contiene el enlace general y el código por
  separado.
- RF-003: el código habilita una sesión web acotada al productor asociado. La
  sesión vence a los 30 minutos; el productor puede registrar varios
  acreedores, consultar sus estados y observaciones, y corregir y reenviar los
  perfiles observados mientras el código siga vigente. No puede elegir ni
  cambiar el productor asociado.
- RF-004: el formulario público usa español simple, pasos breves, etiquetas y
  ejemplos claros, validación compartida de nombres, DNI/RUC, banco y cuenta o
  CCI, y confirmación de datos antes del envío. No muestra información de otros
  productores.
- RF-005: los acreedores creados desde la web o el endpoint mobile nuevo quedan
  `PENDING`. El origen registra si la captura inicial fue `PRODUCTOR` o
  `MOBILE`, y la API conserva el usuario autenticado cuando corresponda.
- RF-006: `ANALISTA` o `ADMIN` puede aprobar un perfil pendiente o registrar
  una observación no vacía. La observación cambia su estado a `OBSERVED`; la
  aprobación cambia su estado a `APPROVED`. Cada acción conserva actor, fecha,
  decisión y observación en el historial de revisión.
- RF-007: editar y reenviar un perfil observado lo devuelve a `PENDING` y
  conserva el historial de observaciones. Una actualización posterior a un
  perfil aprobado también lo deja pendiente de nueva aprobación.
- RF-008: solo perfiles `APPROVED` aparecen como opción para un nuevo registro
  de cosecha. La API verifica este estado al crear; un replay idempotente de un
  registro ya creado conserva su respuesta histórica.
- RF-009: una observación posterior a un registro de cosecha no modifica su
  instantánea. El perfil observado deja de estar disponible para registros
  nuevos hasta que vuelva a aprobarse.
- RNF-001: la verificación de código tiene límite de intentos y no revela si un
  productor o código existe. El código se intercambia por una sesión corta,
  limitada al productor, y no se guarda en almacenamiento persistente del
  navegador.
- RNF-002: código, DNI, cuenta/CCI y payloads bancarios no aparecen en logs,
  URLs, telemetría, trazas ni mensajes de error. Las respuestas sensibles usan
  `Cache-Control: no-store`.
- RNF-003: todas las autorizaciones se ejecutan en API. `ANALISTA` solo puede
  consultar la vista de revisión y ejecutar sus acciones explícitas; no obtiene
  permisos generales de escritura.
- RNF-004: los registros offline existentes, el orden de outbox, la
  idempotencia y las instantáneas de cosecha se preservan. Una confirmación
  mobile no marca sincronización antes de una respuesta válida de API.

## Contratos afectados

- Validación compartida: reutilizar `HarvestCreditorInput` y
  `harvestCreditorSchema`; las entradas públicas no aceptan `productorId`, pues
  la API lo resuelve desde el acceso validado.
- API autenticada: emitir/reemplazar acceso de productor; listar perfiles para
  revisión; aprobar u observar un perfil. La emisión exige `ADMIN` o
  `AGRONOMO`; revisión exige `ADMIN` o `ANALISTA` con mutación explícitamente
  autorizada.
- API pública limitada: intercambiar código por sesión de productor, consultar
  perfiles propios y crear/actualizar perfiles propios bajo esa sesión. Ningún
  endpoint público recibe un productor arbitrario como ámbito de autorización.
- Respuesta de acreedor: agregar estado, origen, última revisión y observación
  vigente. Añadir una entidad de historial de revisión para no perder decisiones
  anteriores al corregir o aprobar.
- PostgreSQL: agregar invitación/código de productor e historial de revisión;
  agregar estado y origen a `acreedores_cosecha`; permitir creador de usuario
  nulo solo para origen productor. Mantener la unicidad natural, los UUID
  públicos y los contratos legados de pagos.
- SQLite/mobile: migración aditiva para estado y origen. Las filas locales
  existentes sincronizadas se consideran aprobadas; las filas todavía
  pendientes de sync quedan pendientes. Los perfiles nuevos mobile se guardan
  localmente como pendientes. La outbox conserva su tipo, orden e idempotencia.
- Admin web: nueva página autenticada de revisión Comercial y nueva ruta
  pública de productor fuera del grupo `(admin)`. La vista de revisión muestra
  datos bancarios completos a `ANALISTA`/`ADMIN`; el portal público muestra solo
  perfiles del productor autorizado por el código.
- Mobile: añadir la acción separada de generar/compartir acceso. Mantener los
  campos y disposición actuales de captura y cosecha; filtrar el selector de
  cosecha por estado aprobado y explicar cuando no haya perfiles aprobados.

## Seguridad y datos

El código es una credencial de invitación y acredita posesión del acceso, no
identidad legal del productor. La emisión requiere sesión autenticada y
autorización horizontal del productor; la renovación revoca el código previo.
El backend almacena solo el hash, aplica limitación por IP/código, expira la
sesión web y rechaza códigos vencidos o revocados.

La vista de revisión expone los datos completos únicamente a `ADMIN` y
`ANALISTA`; guards de API protegen lectura y escritura aunque se oculte la ruta
en UI. Las notas no deben incluir datos sensibles innecesarios. Se conserva el
riesgo R-037 de SQLite sin cifrado y se reevalúa su alcance al agregar revisión
web y acceso público temporal. No hay entrega automática de observaciones: el
productor las consulta al volver al enlace e ingresar su código vigente.

## Migración y rollback

1. Agregar PostgreSQL de forma aditiva: invitaciones, estado/origen de
   acreedores e historial de revisiones. Marcar los acreedores existentes como
   `APPROVED` para preservar el selector de cosecha y completar su origen como
   captura mobile/legada. No modificar filas ni instantáneas históricas.
2. Desplegar API compatible con clientes actuales y nuevos, conservando el
   endpoint legado de `pagos-cosecha`. Toda creación nueva por los endpoints
   actuales o públicos queda pendiente.
3. Desplegar la web de revisión y el portal público. No generar códigos hasta
   que la ruta pública y la API estén disponibles.
4. Publicar mobile con SQLite aditiva, estado/origen en respuestas, acción de
   compartir y filtrado de perfiles aprobados. Perfiles offline anteriores
   conservan sus filas y outbox; el servidor aplica la política de revisión al
   recibirlos.
5. Verificar con una instalación actualizada y una base representativa de
   Comercial antes de ampliar la distribución.

El rollback operativo deshabilita la emisión y las rutas públicas, y revierte
la versión web/mobile. Se conservan tablas, decisiones, códigos revocados y
datos ya recibidos; no ejecutar una migración `down` que elimine información.
Los clientes anteriores pueden seguir usando perfiles históricos aprobados;
los perfiles nuevos no aprobados quedan protegidos por la validación de API.

## Criterios de aceptación

- [ ] CA-001: el agrónomo genera desde Comercial un acceso de 180 días para un
      productor autorizado y comparte enlace más código desde la hoja nativa.
- [ ] CA-002: el código identifica al productor sin permitir cambiarlo; expira,
      puede revocarse y reemplazarse, y no queda almacenado en claro.
- [ ] CA-003: el productor registra varios acreedores, ve sus estados y
      observaciones, y corrige perfiles observados desde un celular sin crear
      cuenta ni acceder al registro de cosecha.
- [ ] CA-004: la revisión muestra cuenta/CCI, documento, origen y actor de
      captura a `ANALISTA`/`ADMIN`; aprobar habilita el perfil y observar exige
      nota y lo bloquea para cosechas nuevas.
- [ ] CA-005: reenviar una corrección vuelve a `PENDING`; aprobarla vuelve a
      habilitar el perfil. Las decisiones previas quedan en historial.
- [ ] CA-006: la app mobile permite capturar acreedores como alternativa y
      solo ofrece los aprobados en el registro de cosecha; la API aplica la
      misma regla.
- [ ] CA-007: los acreedores existentes migran aprobados; SQLite/outbox
      preserva filas pendientes, reintentos y propiedad de sesión.
- [ ] CA-008: un usuario sin rol, un código inválido/vencido o un código de
      otro productor no obtiene datos bancarios ni puede modificar perfiles.
- [ ] CA-009: datos personales, bancarios y credenciales no aparecen en logs,
      errores, URLs ni cachés persistentes.

## Pruebas

- API: validación del código, expiración/revocación, intentos, alcance por
  productor, permisos `ANALISTA`, transición de estados, duplicados, checks de
  aprobación en cosecha e idempotencia.
- PostgreSQL: migración sobre esquema de spec 083 con perfiles, registros,
  acreedores duplicados rechazados por la constraint y pagos legados; verificar
  backfill aprobado y rollback operativo sin pérdida.
- SQLite: migrar catálogo sincronizado y filas con outbox pendiente; confirmar
  estados, propiedad de sesión, retry tras desconexión y no pérdida por error de
  autorización al sincronizar un registro con perfil ya observado.
- Mobile: emisión solo online, compartir enlace/código, creación offline del
  perfil como pendiente y selector de cosecha solo con aprobados.
- Web: flujo público desde celular, campos/validación, consulta por código,
  edición y reenvío observado, vista de revisión, guards por rol, foco de
  teclado y mensajes claros de código inválido/vencido.
- Ejecutar pruebas focalizadas, lint, typecheck y builds de API, mobile y web
  según los gates acordados en el handoff; hacer revisión de seguridad antes de
  cerrar.

La implementación local pasó `pnpm lint`, `pnpm typecheck`, `pnpm test`
(más de 1 900 pruebas), `pnpm build` y `pnpm docs:check` el 2026-10-02. La revisión
independiente con DeepSeek se omitió por instrucción del usuario. La migración
PostgreSQL 064 y el flujo completo en dispositivo quedan para la validación
previa al despliegue; no se ejecutaron en producción ni se publicó OTA.
La prueba Playwright del formulario público en vista móvil pasó con la API
simulada.

## Impacto documental

- [ ] Arquitectura: sincronización mobile y acceso público acotado.
- [ ] Dominio: estado, origen, aprobación y observaciones del acreedor.
- [ ] Seguridad: permisos, invitación y superficie de datos bancarios.
- [ ] Riesgos: reevaluar R-037 por acceso público temporal y exposición web.
- [ ] Índices: enlazar esta spec desde `docs/index.md` y `docs/specs/README.md`.
- [ ] Al completar: cambiar a `implemented`, completar `implemented_in` y
      actualizar los documentos activos.
