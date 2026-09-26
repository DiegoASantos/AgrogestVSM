---
title: Acreedores reutilizables y registro de cosecha
status: implemented
numero: 083
area: mobile, api, database, sync
created: 2026-09-24
approved_by: usuario
implemented_in: apps/api/src/modules/comercial; apps/api/src/database/migrations/063-acreedores-y-registros-cosecha.ts; apps/mobile/src/modules/comercial; apps/mobile/src/shared/database; apps/mobile/src/shared/sync
---

# Spec 083: Acreedores reutilizables y registro de cosecha

## Contexto

El primer avance de Comercial guarda los datos bancarios dentro de cada fila
`pagos_cosecha`. Un productor puede tener varios acreedores, por lo que esos
datos deben convertirse en perfiles reutilizables. Tambien se necesita un
segundo formulario para registrar la cosecha y el acreedor al que se pagara.

## Alcance

### Incluido

- Perfiles de acreedor por productor, con nombres, apellidos, DNI/RUC, banco y
  cuenta o CCI; un productor puede tener varios.
- Dos pasos en Comercial: registrar acreedor y registrar pago de cosecha.
- Segundo paso con productor visible para la sesion, cantidad de jabas, precio
  por jaba en soles, fecha de registro actual no editable, fecha de cosecha
  editable y acreedor.
- Selector de acreedores filtrado por productor; si existe exactamente uno, se
  preselecciona. Los perfiles son visibles para cualquier ADMIN o AGRONOMO que
  tenga acceso vigente al productor.
- Persistencia offline-first, API, PostgreSQL, SQLite, outbox e importacion
  segura de los datos registrados por la version anterior.

### Excluido

- Calculo o persistencia del total a pagar, conversion de moneda, transferencia
  bancaria, edicion/eliminacion de acreedores, reportes y listado historico de
  pagos.
- Disponibilidad sin conexion de los acreedores creados por la version anterior
  antes de una primera sincronizacion/descarga exitosa.

## Requisitos

- RF-001: el primer paso permite elegir solo productores con parcelas visibles
  para la sesion actual y registrar varios acreedores para cada uno.
- RF-002: conserva el interruptor "El acreedor es el productor". Para un
  productor persona completa los datos personales disponibles; banco y cuenta
  siempre requieren ingreso. Tras guardar, mantiene una lista resumida de los
  acreedores del productor y permite agregar otro.
- RF-003: el segundo paso permite elegir un productor del mismo alcance y
  carga sus acreedores. Sin acreedores informa como agregar uno; con uno lo
  selecciona automaticamente; con varios exige una seleccion explicita.
- RF-004: cada registro guarda cantidad de jabas como entero positivo, precio
  por jaba en PEN con hasta dos decimales y sin total calculado. `fechaRegistro`
  se toma de la fecha local actual, se muestra solo lectura y se guarda como
  fecha calendario; `fechaCosecha` inicia con ese valor, admite ingreso
  editable en formato `YYYY-MM-DD` y puede ser anterior, pero no posterior a
  la fecha de registro.
- RF-005: al crear un registro se conserva una instantanea inmutable de los
  datos del acreedor, ademas de su referencia, para que un cambio futuro del
  perfil no reescriba el historial.
- RF-006: un duplicado exacto de acreedor para el mismo productor (tipo y
  numero de documento, banco y cuenta/CCI) devuelve el perfil canonico en vez
  de crear otro. El mismo documento con otra cuenta sigue siendo un acreedor
  seleccionable distinto.
- RNF-001: los datos personales y bancarios no se escriben en logs ni en
  mensajes de error. Se conserva el riesgo aceptado R-037 sobre SQLite sin
  cifrado y se limita la cache por propietario de sesion.
- RNF-002: cada endpoint vuelve a autorizar el productor; crear un registro
  tambien exige que el acreedor pertenezca a ese productor.
- RNF-003: las operaciones offline usan UUID publico e idempotencia. Un
  registro de cosecha no se sincroniza hasta que productor y acreedor tengan
  identidad remota valida.

## Contratos afectados

- Validacion compartida: reemplazar el uso nuevo de `HarvestPaymentInput` por
  `HarvestCreditorInput` y `HarvestRecordInput`; conservar el esquema
  actual para el cliente legado. El nuevo registro usa `creditorId`,
  `crateQuantity`, `cratePrice`, `registrationDate` y `harvestDate`; sus fechas
  son `YYYY-MM-DD`, la cantidad es entera y el precio decimal canonico de hasta
  dos posiciones.
- API, para `ADMIN` y `AGRONOMO` autenticados: `POST /comercial/acreedores-cosecha`,
  `GET /comercial/productores/:productorId/acreedores-cosecha` y
  `POST /comercial/registros-cosecha`. Las creaciones reciben `publicId` para
  reintento idempotente. El POST de registro resuelve el acreedor autorizado en
  servidor y construye la instantanea historica; no acepta datos bancarios
  libres como sustituto del acreedor seleccionado.
- PostgreSQL: agregar `acreedores_cosecha` y `registros_cosecha`, ambas con
  `id` bigint, `public_id` UUID, productor, auditoria e indices de consulta.
  El registro contiene acreedor, jabas, precio `numeric(12,2)`, ambas fechas y
  la instantanea del acreedor. Mantener `pagos_cosecha` y su endpoint como
  contrato legado compatible.
- SQLite: migracion 74 aditiva y esquema base con `acreedores_cosecha` y
  `registros_cosecha`. Ambas tablas conservan `local_id`, `public_id`,
  `server_id`, estado/errores de sync y `owner_user_id`; los acreedores
  descargados se consultan solo para la sesion propietaria. El registro guarda
  la instantanea tomada al confirmar el formulario.
- Sync: nuevos tipos `acreedores_cosecha` y `registros_cosecha`; el acreedor se
  procesa despues del productor y antes de su registro. La descarga de perfiles
  se realiza al elegir el productor, actualiza la cache de la sesion y no pisa
  filas locales pendientes.

## Seguridad y datos

Los numeros de documento y cuenta son datos personales. La API exige JWT, roles
actuales y la autorizacion horizontal del productor en listar, crear acreedor y
crear registro. La respuesta de acreedores se entrega solo a actores con ese
acceso y se guarda en SQLite con el propietario de la sesion actual.

Un acreedor creado offline puede coincidir con uno creado por otro usuario. El
servidor resuelve el indice unico natural y responde el perfil existente; el
handler local adopta su `server_id` y queda sincronizado sin duplicar datos.

## Migracion y rollback

1. Desplegar primero migracion PostgreSQL y API compatible. La migracion crea
   las tablas nuevas e importa los `pagos_cosecha` existentes agrupandolos por
   productor, documento, banco y cuenta/CCI; conserva la fila mas antigua como
   fuente determinista del perfil. No borra ni transforma filas legadas.
2. Mientras exista el endpoint legado, cada POST legado tambien busca o crea el
   perfil correspondiente en la nueva tabla. Asi las colas instaladas pendientes
   se entregan con el contrato que conocen y aparecen luego en el selector.
3. Publicar despues la version mobile con SQLite 74. No se reescribe ni se
   elimina `pagos_cosecha` ni su outbox: las entradas pendientes siguen su
   handler y endpoint originales. Al tener conexion, el selector descarga los
   perfiles importados para el productor.
4. El rollback operativo revierte la API/mobile nueva pero conserva las tablas
   aditivas y los datos nuevos; no se ejecuta un `down` destructivo tras crear
   negocio. Recuperacion de datos solo mediante backup aprobado y correccion
   hacia adelante.

## Criterios de aceptacion

- [x] CA-001: un usuario solo ve productores con parcelas visibles asignadas,
      tanto al crear acreedor como al registrar cosecha.
- [x] CA-002: puede guardar dos o mas acreedores del mismo productor y elegir
      cualquiera al registrar la cosecha; si hay solo uno queda seleccionado.
- [x] CA-003: la segunda forma guarda jabas enteras positivas, precio en PEN,
      fecha actual solo lectura y fecha de cosecha editable sin fecha futura.
- [x] CA-004: el acreedor y sus datos bancarios se conservan como instantanea
      en el registro, aun si mas adelante se modifica el perfil.
- [x] CA-005: guardar offline crea en una sola transaccion la fila y outbox;
      el registro espera al acreedor pendiente y se recupera tras reiniciar y
      reconectar.
- [x] CA-006: API rechaza productor fuera de alcance o acreedor de otro
      productor y no duplica un reintento por `publicId` ni un perfil identico.
- [x] CA-007: datos y entradas pendientes de `pagos_cosecha` previos se
      conservan y se convierten en perfiles en servidor sin alterar su payload.

## Pruebas

- Unitarias de Zod y DTO para DNI/RUC, banco, CCI, jabas enteras, precio con
  dos decimales y fechas validas.
- Servicio/API: permisos horizontales, idempotencia, deduplicacion de acreedor,
  referencia productor-acreedor invalida e instantanea de registro.
- Migraciones PostgreSQL y SQLite sobre esquema vacio y una base con
  `pagos_cosecha`/outbox pendientes; comprobar que ninguna fila ni entrada
  previa se borra o modifica.
- Mobile: productores asignados, autocompletado del productor, multiples/uno/
  cero acreedores, fecha editable validada y teclado visible con `FormScrollView`.
- Sync: exito, sin conexion, reintento, padre pendiente, coincidencia canonica
  remota y fallo permanente sin publicar al hijo anticipadamente.
- Ejecutar lint, typecheck, pruebas focalizadas y gates proporcionales de API,
  validation y mobile antes de la entrega.

## Impacto documental

- [x] Actualizar `docs/architecture/mobile-offline-sync.md` con las dos nuevas
      entidades, cache por sesion y orden padre-hijo.
- [x] Actualizar `docs/domain/data-model.md` con acreedores y registros de
      cosecha.
- [x] Actualizar `docs/operations/risk-register.md` para el alcance ampliado de
      R-037 o registrar el riesgo sustituto.
- [x] Enlazar esta spec en los indices documentales.
